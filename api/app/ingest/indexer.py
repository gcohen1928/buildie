import os
import tempfile
import shutil
import git  # gitpython
import ast
import openai
import faiss
import numpy as np
from typing import List, Dict, Any

# NOTE: Requires: pip install gitpython openai faiss-cpu numpy tiktoken
try:
    import tiktoken
    enc = tiktoken.encoding_for_model("text-embedding-ada-002")
    def count_tokens(text):
        return len(enc.encode(text))
except ImportError:
    def count_tokens(text):
        # Fallback: estimate 1 token per 4 chars
        return max(1, len(text) // 4)

MAX_TOKENS_PER_CHUNK = 2000  # Stay well below 8192
MAX_TOKENS_PER_BATCH = 7000  # Leave headroom for batch
MIN_LINES_PER_CHUNK = 5

class RepoIndexer:
    """
    Indexes a GitHub repo: downloads code, chunks it, embeds it, and stores for search.
    Uses OpenAI for embeddings and FAISS for vector storage.
    """
    def __init__(self, embedding_model="text-embedding-ada-002", openai_api_key=None, vector_db_path=None):
        self.embedding_model = embedding_model
        self.openai_api_key = openai_api_key or os.getenv("OPENAI_API_KEY")
        openai.api_key = self.openai_api_key
        self.vector_db_path = vector_db_path or "faiss.index"
        self.index = None
        self.metadata = []  # List of dicts, one per vector

    def index_repo(self, repo_url: str) -> bool:
        """
        Download and index the given GitHub repo.
        """
        temp_dir = tempfile.mkdtemp()
        try:
            self._clone_repo(repo_url, temp_dir)
            code_chunks = self._chunk_codebase(temp_dir)
            embeddings = self._embed_chunks(code_chunks)
            self._store_embeddings(embeddings)
            return True
        finally:
            shutil.rmtree(temp_dir)

    def _clone_repo(self, repo_url: str, dest_dir: str):
        """
        Clone the GitHub repo to a local directory.
        """
        git.Repo.clone_from(repo_url, dest_dir)

    def _chunk_codebase(self, repo_dir: str) -> List[Dict[str, Any]]:
        """
        Walk the repo and chunk code files by function/class (AST) or by lines.
        Returns a list of dicts: { 'text': ..., 'metadata': ... }
        """
        code_chunks = []
        for root, _, files in os.walk(repo_dir):
            for fname in files:
                if fname.startswith('.') or fname.endswith('.md') or fname.endswith('.txt'):
                    continue
                fpath = os.path.join(root, fname)
                rel_path = os.path.relpath(fpath, repo_dir)
                try:
                    if fname.endswith('.py'):
                        code_chunks.extend(self._chunk_python_file(fpath, rel_path))
                    else:
                        code_chunks.extend(self._chunk_text_file(fpath, rel_path))
                except Exception as e:
                    print(f"Skipping {fpath}: {e}")
        return code_chunks

    def _chunk_python_file(self, fpath: str, rel_path: str) -> List[Dict[str, Any]]:
        with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
            source = f.read()
        try:
            tree = ast.parse(source)
        except Exception as e:
            print(f"AST parse failed for {fpath}: {e}")
            return self._chunk_text_file(fpath, rel_path)
        chunks = []
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                start = node.lineno - 1
                end = getattr(node, 'end_lineno', None) or start + 1
                lines = source.splitlines()[start:end]
                chunk_text = '\n'.join(lines)
                # Split large chunks by tokens
                if count_tokens(chunk_text) > MAX_TOKENS_PER_CHUNK:
                    # Split by lines to fit token limit
                    split_chunks = self._split_large_chunk(chunk_text, rel_path, start+1, end)
                    chunks.extend(split_chunks)
                else:
                    chunks.append({
                        'text': chunk_text,
                        'metadata': {
                            'file': rel_path,
                            'type': type(node).__name__,
                            'name': getattr(node, 'name', None),
                            'start_line': start + 1,
                            'end_line': end
                        }
                    })
        return chunks if chunks else self._chunk_text_file(fpath, rel_path)

    def _split_large_chunk(self, chunk_text, rel_path, start_line, end_line):
        lines = chunk_text.splitlines()
        chunks = []
        i = 0
        n = len(lines)
        while i < n:
            sub_lines = []
            token_count = 0
            j = i
            while j < n and token_count < MAX_TOKENS_PER_CHUNK:
                sub_lines.append(lines[j])
                token_count = count_tokens('\n'.join(sub_lines))
                j += 1
            # If still too large, recursively split further
            if token_count > MAX_TOKENS_PER_CHUNK and (j - i) > MIN_LINES_PER_CHUNK:
                mid = i + (j - i) // 2
                left_chunk = '\n'.join(lines[i:mid])
                right_chunk = '\n'.join(lines[mid:j])
                chunks.extend(self._split_large_chunk(left_chunk, rel_path, start_line + i, start_line + mid - 1))
                chunks.extend(self._split_large_chunk(right_chunk, rel_path, start_line + mid, start_line + j - 1))
            else:
                chunk = '\n'.join(sub_lines)
                if chunk.strip():  # Only add non-empty chunks
                    chunks.append({
                        'text': chunk,
                        'metadata': {
                            'file': rel_path,
                            'type': 'split_large',
                            'start_line': start_line + i,
                            'end_line': start_line + j - 1
                        }
                    })
            i = j
        return chunks

    def _chunk_text_file(self, fpath: str, rel_path: str, chunk_size: int = 15, overlap: int = 3) -> List[Dict[str, Any]]:
        with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
        chunks = []
        i = 0
        n = len(lines)
        while i < n:
            chunk_lines = lines[i:i+chunk_size]
            chunk_text = ''.join(chunk_lines)
            if count_tokens(chunk_text) > MAX_TOKENS_PER_CHUNK:
                split_chunks = self._split_large_chunk(chunk_text, rel_path, i+1, min(i+chunk_size, n))
                chunks.extend(split_chunks)
            elif chunk_text.strip():  # Only add non-empty chunks
                chunks.append({
                    'text': chunk_text,
                    'metadata': {
                        'file': rel_path,
                        'type': 'text',
                        'start_line': i + 1,
                        'end_line': min(i + chunk_size, n)
                    }
                })
            i += chunk_size - overlap
        return chunks

    def _embed_chunks(self, code_chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        texts = [chunk['text'] for chunk in code_chunks]
        embeddings = []
        batch = []
        batch_token_count = 0
        batch_indices = []
        for idx, text in enumerate(texts):
            tokens = count_tokens(text)
            if tokens > MAX_TOKENS_PER_CHUNK:
                # Should not happen, but skip if still too large
                print(f"Warning: skipping chunk with {tokens} tokens (too large for embedding)")
                continue
            if not text.strip():
                # Skip empty/whitespace chunks
                continue
            if batch_token_count + tokens > MAX_TOKENS_PER_BATCH or len(batch) >= 20:
                if batch:  # Only call API if batch is non-empty
                    resp = openai.embeddings.create(input=batch, model=self.embedding_model)
                    for j, emb in enumerate(resp.data):
                        embeddings.append({
                            'embedding': np.array(emb.embedding, dtype=np.float32),
                            'metadata': code_chunks[batch_indices[j]]['metadata']
                        })
                batch = []
                batch_token_count = 0
                batch_indices = []
            batch.append(text)
            batch_token_count += tokens
            batch_indices.append(idx)
        # Final batch
        if batch:  # Only call API if batch is non-empty
            resp = openai.embeddings.create(input=batch, model=self.embedding_model)
            for j, emb in enumerate(resp.data):
                embeddings.append({
                    'embedding': np.array(emb.embedding, dtype=np.float32),
                    'metadata': code_chunks[batch_indices[j]]['metadata']
                })
        return embeddings

    def _store_embeddings(self, embeddings: List[Dict[str, Any]]):
        """
        Store embeddings and metadata in the vector database.
        """
        if not embeddings:
            return
        dim = len(embeddings[0]['embedding'])
        xb = np.stack([e['embedding'] for e in embeddings])
        if os.path.exists(self.vector_db_path):
            self.index = faiss.read_index(self.vector_db_path)
            self.metadata.extend([e['metadata'] for e in embeddings])
        else:
            self.index = faiss.IndexFlatL2(dim)
            self.metadata = [e['metadata'] for e in embeddings]
        self.index.add(xb)
        faiss.write_index(self.index, self.vector_db_path)
        # Save metadata alongside index
        meta_path = self.vector_db_path + '.meta'
        import json
        with open(meta_path, 'w') as f:
            json.dump(self.metadata, f, indent=2) 