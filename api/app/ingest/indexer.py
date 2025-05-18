import os
import tempfile
import shutil
import git  # gitpython
import ast
import openai
import numpy as np
import logging  # Add explicit logging import
from typing import List, Dict, Any, Set
from supabase import create_client, Client # Added Supabase
from urllib.parse import urlparse # Added for URL parsing
from postgrest.exceptions import APIError  # Added for handling APIError
import hashlib  # Added for generating hash-based IDs

# NOTE: Requires: pip install gitpython openai numpy tiktoken supabase
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

# File indexing limits
MAX_FILE_SIZE_TO_INDEX = 1024 * 1024  # 1MB max file size to process
ALWAYS_IGNORE_FILES = {
    # Build artifacts and dependencies
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'node_modules',
    # Compiled code
    'dist', 'build', 'target', '.class', '.pyc', '.pyo', '.o', '.so', '.dll', '.exe',
    # Generated files
    'generated', '.d.ts', '.min.js', '.min.css', '.bundle.js',
    # Large data files
    '.csv', '.tsv', '.parquet', '.avro', '.pb',
    # Binary and media files (adding more to existing list)
    '.zip', '.tar', '.gz', '.rar', '.jar', '.war', '.ear', '.ico', '.woff', '.woff2', '.ttf', '.eot',
    # Docker related
    'Dockerfile.lock', 'docker-compose.override.yml',
    # IDE and editor files
    '.idea', '.vscode', '.project', '.classpath', '.settings',
}

# File extensions to ignore (augmenting the existing list)
IGNORE_EXTENSIONS = {
    # Documentation
    '.md', '.txt', '.rst', '.pdf', '.docx',
    # Data formats
    '.json', '.lock', '.sum', '.yaml', '.yml', 
    # Media files
    '.svg', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp',
    # Binary files
    '.bin', '.dat', '.db', '.sqlite', '.sqlite3',
    # Archive files
    '.zip', '.tar', '.gz', '.rar', '.7z',
}

# Directories to ignore
IGNORE_DIR_PATTERNS = {
    'test', 'tests', 'example', 'examples', 'doc', 'docs', 'node_modules',
    'vendor', 'third_party', 'build', 'dist', 'out', 'target', '.git', '.github',
    'archive', 'backup', 'temp', 'tmp'
}

SUPABASE_TABLE_NAME = "code_embeddings"

class RepoIndexer:
    """
    Indexes a GitHub repo: downloads code, chunks it, embeds it, and stores for search.
    Uses OpenAI for embeddings and Supabase for vector storage.
    """
    def __init__(self, embedding_model="text-embedding-ada-002", openai_api_key=None, supabase_url=None, supabase_key=None, supabase_table_name=None):
        self.embedding_model = embedding_model
        self.openai_api_key = openai_api_key or os.getenv("OPENAI_API_KEY")
        openai.api_key = self.openai_api_key

        _supabase_url = supabase_url or os.getenv("SUPABASE_URL")
        _supabase_key = supabase_key or os.getenv("SUPABASE_KEY")
        if not _supabase_url or not _supabase_key:
            raise ValueError("Supabase URL and Key must be provided or set as environment variables.")
        self.supabase: Client = create_client(_supabase_url, _supabase_key)
        self.supabase_table_name = supabase_table_name or SUPABASE_TABLE_NAME
        self.current_project_id = None # To store the ID of the project being indexed

    def _create_project_entry(self, repo_url: str) -> str:
        """
        Creates a new project entry in the 'projects' table for the given repo_url.
        Returns the ID of the newly created project.
        """
        try:
            parsed_url = urlparse(repo_url)
            path_segments = [segment for segment in parsed_url.path.split('/') if segment]
            
            if len(path_segments) >= 2:
                project_name = path_segments[-1]
                project_full_name = f"{path_segments[-2]}/{path_segments[-1]}"
            elif len(path_segments) == 1:
                project_name = path_segments[0]
                project_full_name = path_segments[0]
            else:
                project_name = "unknown_project_name"
                project_full_name = "unknown_owner/unknown_project_name"
            
            # Generate a unique github_repo_id based on the repository URL
            # This ensures uniqueness without requiring the GitHub API
            # We use a positive integer by taking the absolute value of the hash
            github_repo_id = abs(int(hashlib.md5(repo_url.encode()).hexdigest(), 16) % (10 ** 16))
            print(f"Generated github_repo_id: {github_repo_id} for repo: {repo_url}")

            project_data = {
                "name": project_name,
                "full_name": project_full_name,
                "github_repo_id": github_repo_id,
                "html_url": repo_url,
                # user_id is also in projects table, not handled here.
                # Assumes user_id is nullable or has a default in your DB schema,
                # or this insert will fail if user_id is NOT NULL without a default.
            }
            
            print(f"Attempting to create project entry with data: {project_data}")
            # Ensure the 'projects' table name is correct if it's different
            response = self.supabase.table("projects").insert(project_data).execute()
            
            if response.data and len(response.data) > 0:
                project_id = response.data[0]['id']
                print(f"Successfully created project with ID: {project_id}")
                return project_id
            else:
                # Attempt to construct a more informative error message
                error_detail = "Unknown error"
                if hasattr(response, 'error') and response.error:
                    error_detail = str(response.error)
                elif hasattr(response, 'status_code') and response.status_code not in [200, 201]: # Check for non-success status codes
                    error_detail = f"Status: {response.status_code}, Message: {getattr(response, 'message', '') or getattr(response, 'details', '')}"
                
                error_message = f"Failed to create project entry for {repo_url}. Details: {error_detail}. Response: {response}"
                print(error_message)
                raise Exception(error_message)
        except APIError as e:
            # Check the specific constraint violation
            error_code = getattr(e, 'code', None)
            error_details = str(e)
            
            if error_code == '23505':  # PostgreSQL unique violation error code
                # Handle either github_repo_id or full_name constraint violation
                
                if 'projects_github_repo_id_key' in error_details:
                    # Handle github_repo_id constraint
                    print(f"Duplicate github_repo_id detected for {repo_url}. Finding existing project...")
                    
                    try:
                        query_response = self.supabase.table("projects").select("id").eq("github_repo_id", github_repo_id).execute()
                        
                    except Exception as query_error:
                        print(f"Error finding existing project by github_repo_id: {query_error}")
                        raise
                        
                elif 'projects_full_name_key' in error_details:
                    # Handle full_name constraint
                    print(f"Project with full_name '{project_full_name}' already exists. Finding existing project...")
                    
                    try:
                        query_response = self.supabase.table("projects").select("id").eq("full_name", project_full_name).execute()
                        
                    except Exception as query_error:
                        print(f"Error finding existing project by full_name: {query_error}")
                        raise
                else:
                    # Some other unique constraint - re-raise
                    print(f"API Error during project creation for {repo_url}: {e}")
                    raise
                
                # Common handling for both constraint types after finding the existing project
                if query_response.data and len(query_response.data) > 0:
                    existing_project_id = query_response.data[0]['id']
                    print(f"Found existing project with ID: {existing_project_id}")
                    
                    # Delete all existing embeddings for this project
                    print(f"Deleting existing embeddings for project ID: {existing_project_id}")
                    delete_response = self.supabase.table(self.supabase_table_name).delete().eq("project_id", existing_project_id).execute()
                    
                    # Check if delete was successful
                    if hasattr(delete_response, 'error') and delete_response.error:
                        print(f"Warning: Error deleting existing embeddings: {delete_response.error}")
                    else:
                        print(f"Successfully deleted existing embeddings for project ID: {existing_project_id}")
                    
                    return existing_project_id
                else:
                    constraint_type = "github_repo_id" if 'projects_github_repo_id_key' in error_details else "full_name"
                    constraint_value = github_repo_id if constraint_type == "github_repo_id" else project_full_name
                    raise Exception(f"Could not find existing project with {constraint_type}={constraint_value} despite duplicate key error")
            else:
                # Not a unique constraint violation - re-raise
                print(f"API Error during project creation for {repo_url}: {e}")
                raise
        except Exception as e:
            print(f"Exception during project creation for {repo_url}: {e}")
            import traceback
            traceback.print_exc()
            raise

    def index_repo(self, repo_url: str) -> bool:
        """
        Download and index the given GitHub repo.
        Creates a project entry and associates embeddings with it.
        """
        print(f"Starting indexing for repo: {repo_url}")
        try:
            # Create a project entry for this indexing run
            self.current_project_id = self._create_project_entry(repo_url)
            # _create_project_entry will raise an exception if it fails, so no need to check here explicitly.

            temp_dir = tempfile.mkdtemp()
            print(f"Created temporary directory: {temp_dir}")
            try:
                print("Cloning repo...")
                self._clone_repo(repo_url, temp_dir)
                print("Repo cloned. Starting code chunking...")
                code_chunks = self._chunk_codebase(temp_dir)
                print(f"Code chunking complete. Found {len(code_chunks)} chunks. Starting embedding and live storing for project ID: {self.current_project_id}...")
                inserted_count, failed_count = self._embed_chunks_and_store(code_chunks)
                print(f"Embedding and storing process complete for project {self.current_project_id}. Total inserted: {inserted_count}, Total failed: {failed_count}.")
                return True
            except Exception as e:
                print(f"An error occurred during indexing: {e}")
                import traceback
                traceback.print_exc()
                return False
            finally:
                print(f"Cleaning up temporary directory: {temp_dir}")
                shutil.rmtree(temp_dir)
        except Exception as e:
            print(f"An error occurred during indexing: {e}")
            import traceback
            traceback.print_exc()
            return False

    def _clone_repo(self, repo_url: str, dest_dir: str):
        """
        Clone the GitHub repo to a local directory.
        """
        git.Repo.clone_from(repo_url, dest_dir)

    def _chunk_single_file_task(self, task_args: tuple) -> List[Dict[str, Any]]:
        fpath, rel_path, is_python_file = task_args
        try:
            if is_python_file:
                return self._chunk_python_file(fpath, rel_path)
            else:
                return self._chunk_text_file(fpath, rel_path)
        except Exception as e:
            logging.warning(f"Error chunking file {fpath} in parallel task: {e}", exc_info=True)
            return []

    def _chunk_codebase(self, repo_dir: str) -> List[Dict[str, Any]]:
        """
        Walk the repo and chunk code files by function/class (AST) or by lines.
        Returns a list of dicts: { 'text': ..., 'metadata': ... }
        """
        code_chunks = []
        file_count = 0
        skipped_count = 0
        
        for root, dirs, files in os.walk(repo_dir):
            # Skip directories that match ignore patterns
            dirs_to_remove = []
            for d in dirs:
                if d.startswith('.') or any(pattern in d.lower() for pattern in IGNORE_DIR_PATTERNS):
                    dirs_to_remove.append(d)
            
            for d in dirs_to_remove:
                dirs.remove(d)
            
            for fname in files:
                file_count += 1
                fpath = os.path.join(root, fname)
                rel_path = os.path.relpath(fpath, repo_dir)
                
                # Detailed skip reasons for better logging
                skip_reason = None
                
                # Check filename patterns first (quick check)
                if fname.startswith('.'):
                    skip_reason = "hidden file"
                elif fname in ALWAYS_IGNORE_FILES:
                    skip_reason = "ignored filename"
                elif any(fname.endswith(ext) for ext in IGNORE_EXTENSIONS):
                    skip_reason = "ignored extension"
                elif any(pattern in rel_path.lower() for pattern in IGNORE_DIR_PATTERNS):
                    skip_reason = "ignored directory pattern"
                
                # Check file size if not already skipped
                if not skip_reason:
                    try:
                        file_size = os.path.getsize(fpath)
                        if file_size > MAX_FILE_SIZE_TO_INDEX:
                            skip_reason = f"file too large ({file_size / (1024*1024):.2f}MB)"
                    except Exception as e:
                        skip_reason = f"error checking size: {e}"
                
                if skip_reason:
                    skipped_count += 1
                    if file_count % 100 == 0 or skipped_count < 10:  # Limit logging for large repos
                        print(f"  Skipping ({skip_reason}): {rel_path}")
                    continue
                    
                if file_count % 50 == 0:
                    print(f"Processing file {file_count} (skipped {skipped_count}): {rel_path}")
                
                try:
                    if fname.endswith('.py'):
                        code_chunks.extend(self._chunk_python_file(fpath, rel_path))
                    else:
                        code_chunks.extend(self._chunk_text_file(fpath, rel_path))
                except Exception as e:
                    print(f"Error processing {fpath}: {e}")
                    skipped_count += 1
                    
        print(f"Processed {file_count} files, skipped {skipped_count}, generated {len(code_chunks)} chunks")
        return code_chunks

    def _chunk_python_file(self, fpath: str, rel_path: str) -> List[Dict[str, Any]]:
        with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
            source = f.read()
        try:
            tree = ast.parse(source)
        except Exception as e:
            logging.warning(f"AST parse failed for {fpath}, falling back to text chunking: {e}")
            return self._chunk_text_file(fpath, rel_path)
        chunks = []
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                start = node.lineno - 1
                end = getattr(node, 'end_lineno', None) or start + 1 # Ensure end is valid
                lines = source.splitlines()[start:end]
                chunk_text = '\n'.join(lines)
                chunk_text = chunk_text.replace('\u0000', '') # Sanitize null characters
                # Split large chunks by tokens
                if count_tokens(chunk_text) > MAX_TOKENS_PER_CHUNK:
                    logging.debug(f"Python chunk too large ({count_tokens(chunk_text)} tokens), splitting: {rel_path} lines {start+1}-{end}")
                    split_chunks = self._split_large_chunk(chunk_text, rel_path, start+1, end, "python_ast_split")
                    chunks.extend(split_chunks)
                elif chunk_text.strip(): 
                    chunks.append({
                        'text': chunk_text, # Already sanitized
                        'metadata': {
                            'file': rel_path,
                            'type': type(node).__name__,
                            'name': getattr(node, 'name', None),
                            'start_line': start + 1,
                            'end_line': end
                        }
                    })
        if not chunks: 
            logging.debug(f"No AST chunks found for {fpath}, using text chunking for the whole file.")
            return self._chunk_text_file(fpath, rel_path)
        return chunks

    def _split_large_chunk(self, chunk_text: str, rel_path: str, original_start_line: int, original_end_line: int) -> List[Dict[str, Any]]:
        """Recursively splits a chunk of text if it's too large. 
           First by lines, then by characters as a fallback for very long single lines."""
        chunk_text = chunk_text.replace('\u0000', '') # Ensure sanitization at entry
        lines = chunk_text.splitlines()
        final_chunks = []
        current_line_offset = 0 # For tracking line numbers within the current chunk_text

        if not lines: # Should not happen if chunk_text is not empty
            if chunk_text.strip(): # chunk_text was spaces/newlines only
                # If original chunk_text had content (even just whitespace), but no lines after splitlines()
                # This means chunk_text might be purely whitespace or empty.
                # We can return an empty list or a chunk if it has meaning.
                # For safety, let's return empty if strip() is empty.
                return []
            # If chunk_text had content and splitlines somehow made it empty (e.g. just \n)
            # And original chunk_text itself is too large by tokens
            if count_tokens(chunk_text) > MAX_TOKENS_PER_CHUNK:
                # Fallback to character split for non-line content if it's too large
                # This is an edge case.
                pass # Will be handled by the single-line logic below if chunk_text becomes one "line"
            else: # Small enough, non-empty, but no newlines
                final_chunks.append({
                    'text': chunk_text,
                    'metadata': {
                        'file': rel_path,
                        'type': 'whitespace_or_no_newline_chunk',
                        'start_line': original_start_line,
                        'end_line': original_end_line
                    }
                })
                return final_chunks

        # Case 1: Multiple lines in current chunk_text - try to split by lines
        if len(lines) > 1:
            i = 0
            n_lines = len(lines)
            while i < n_lines:
                sub_lines_buffer = []
                current_tokens = 0
                line_idx_in_buffer = i
                while line_idx_in_buffer < n_lines:
                    line_to_add = lines[line_idx_in_buffer]
                    tokens_if_added = count_tokens('\n'.join(sub_lines_buffer + [line_to_add]))
                    
                    if sub_lines_buffer and tokens_if_added > MAX_TOKENS_PER_CHUNK:
                        # Current sub_lines_buffer is as large as it can be without this line
                        break 
                    
                    sub_lines_buffer.append(line_to_add)
                    current_tokens = tokens_if_added
                    line_idx_in_buffer += 1
                    
                    if current_tokens > MAX_TOKENS_PER_CHUNK: # Added line made it too big
                        break
                
                # sub_lines_buffer is now lines[i : line_idx_in_buffer]
                # original line numbers for this segment: original_start_line + i to original_start_line + line_idx_in_buffer -1
                segment_text = '\n'.join(sub_lines_buffer)
                segment_tokens = count_tokens(segment_text)

                current_segment_start_line = original_start_line + i
                current_segment_end_line = original_start_line + line_idx_in_buffer - 1

                if segment_tokens > MAX_TOKENS_PER_CHUNK:
                    # This segment (even if multiple lines) is still too big, recurse
                    # This recursive call will handle further splitting (e.g. if it becomes a single line again)
                    final_chunks.extend(self._split_large_chunk(segment_text, rel_path, 
                                                              current_segment_start_line, current_segment_end_line))
                elif segment_text.strip():
                    final_chunks.append({
                        'text': segment_text,
                        'metadata': {
                            'file': rel_path,
                            'type': 'line_split_segment',
                            'start_line': current_segment_start_line,
                            'end_line': current_segment_end_line
                        }
                    })
                i = line_idx_in_buffer # Move to the next segment
            return final_chunks

        # Case 2: Single line in current chunk_text (or original chunk_text had no newlines)
        # chunk_text is effectively lines[0] here if len(lines) == 1, or original chunk_text
        single_line_text = chunk_text 
        if count_tokens(single_line_text) > MAX_TOKENS_PER_CHUNK:
            # print(f"  Info: Single line/no-newline text too large ({count_tokens(single_line_text)} tokens). Splitting by chars. File: {rel_path}, Original lines: {original_start_line}-{original_end_line}")
            char_split_chunks = []
            current_pos = 0
            while current_pos < len(single_line_text):
                # Estimate slice end based on remaining tokens needed (avg 3 chars/token for safety)
                estimated_char_len = MAX_TOKENS_PER_CHUNK * 3 
                slice_end = min(current_pos + estimated_char_len, len(single_line_text))
                sub_text_piece = single_line_text[current_pos:slice_end]
                
                # Refine sub_text_piece to fit token limit by reducing its end
                while count_tokens(sub_text_piece) > MAX_TOKENS_PER_CHUNK and len(sub_text_piece) > 1:
                    # Reduce by 10% or at least 1 char, from the end
                    reduction = max(1, int(len(sub_text_piece) * 0.1))
                    sub_text_piece = sub_text_piece[:-reduction]
                
                # If it became empty after reduction, try to advance past this point or break
                if not sub_text_piece.strip() and len(sub_text_piece) > 0 : # Was some non-empty string that became all whitespace
                     current_pos += len(sub_text_piece) # Skip this whitespace part
                     if current_pos >= len(single_line_text): break
                     continue
                elif not sub_text_piece: # Became truly empty string
                    if slice_end >= len(single_line_text): break # Reached end of original string
                    # This can happen if initial estimated_char_len is too small and reduction makes it empty.
                    # Try to advance current_pos by a bit to avoid infinite loop if stuck.
                    current_pos = slice_end if slice_end > current_pos else current_pos + 1
                    if current_pos >= len(single_line_text): break
                    continue

                char_split_chunks.append({
                    'text': sub_text_piece,
                    'metadata': {
                        'file': rel_path,
                        'type': 'char_split_segment',
                        'start_line': original_start_line, # Line numbers are for the original block
                        'end_line': original_end_line,
                        'comment': f'Original content from lines {original_start_line}-{original_end_line} split by characters'
                    }
                })
                current_pos += len(sub_text_piece)
                if current_pos >= len(single_line_text) or not sub_text_piece.strip():
                    break # Exit if done or last piece was whitespace
            return char_split_chunks
        elif single_line_text.strip(): # Single line and small enough
            final_chunks.append({
                'text': single_line_text,
                'metadata': {
                    'file': rel_path,
                    'type': 'single_line_small_chunk',
                    'start_line': original_start_line,
                    'end_line': original_end_line
                }
            })
            return final_chunks
        
        return [] # Should be covered by other returns, but as a fallback.

    def _chunk_text_file(self, fpath: str, rel_path: str, chunk_size: int = 15, overlap: int = 3) -> List[Dict[str, Any]]:
        with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
        chunks = []
        i = 0
        n = len(lines)
        if n == 0: return []

        while i < n:
            chunk_lines = lines[i:i+chunk_size]
            chunk_text = ''.join(chunk_lines)
            chunk_text = chunk_text.replace('\u0000', '') # Sanitize null characters
            if count_tokens(chunk_text) > MAX_TOKENS_PER_CHUNK:
                split_chunks = self._split_large_chunk(chunk_text, rel_path, i+1, min(i+chunk_size, n)) # chunk_text is sanitized
                chunks.extend(split_chunks)
            elif chunk_text.strip():  
                chunks.append({
                    'text': chunk_text, # Already sanitized
                    'metadata': {
                        'file': rel_path,
                        'type': 'text',
                        'start_line': i + 1,
                        'end_line': min(i + chunk_size, n)
                    }
                })
            
            next_i = i + chunk_size - overlap
            if next_i <= i and n > i : # Ensure progress
                 next_i = i + 1
            i = next_i
        return chunks

    def _embed_chunks_and_store(self, code_chunks: List[Dict[str, Any]]) -> tuple[int, int]:
        """Embeds chunks and stores them directly to Supabase in batches as they are processed."""
        
        if not self.current_project_id:
            print("Error: current_project_id is not set. Cannot store embeddings without a project ID.")
            # Count all chunks as failed if no project_id
            return 0, sum(1 for chunk_doc in code_chunks if chunk_doc['text'].strip())

        # Prepare a list of items to process, filtering out chunks that are definitely too large even before OpenAI batching
        # Each item: {'text': str, 'metadata_obj': dict}
        valid_items_to_process = []
        for chunk_doc in code_chunks:
            text = chunk_doc['text']
            if count_tokens(text) > MAX_TOKENS_PER_CHUNK: # Primary check from chunking should catch this
                print(f"  Warning (pre-batch): Chunk too large for embedding ({count_tokens(text)} tokens). File: {chunk_doc['metadata'].get('file')}, Lines: {chunk_doc['metadata'].get('start_line')}-{chunk_doc['metadata'].get('end_line')}. Skipping.")
                continue
            if not text.strip():
                continue
            valid_items_to_process.append({'text': text, 'metadata_obj': chunk_doc['metadata']})

        total_inserted_count = 0
        total_failed_count = 0
        
        openai_batch_texts = [] # Texts for the current OpenAI API call
        openai_batch_original_metadata = [] # Corresponding metadata objects for openai_batch_texts
        openai_batch_token_count = 0

        print(f"Starting live embedding and storing for {len(valid_items_to_process)} processable chunks.")

        for idx, item_to_process in enumerate(valid_items_to_process):
            current_text = item_to_process['text']
            current_metadata = item_to_process['metadata_obj']
            current_tokens = count_tokens(current_text) # Already checked <= MAX_TOKENS_PER_CHUNK

            if idx > 0 and idx % 50 == 0: # Log progress every 50 main items
                print(f"  Processed {idx}/{len(valid_items_to_process)} items for OpenAI batching. Current Supabase inserts: {total_inserted_count}")

            # If adding current_text exceeds OpenAI batch limits, process existing openai_batch_texts first
            if openai_batch_texts and (openai_batch_token_count + current_tokens > MAX_TOKENS_PER_BATCH or len(openai_batch_texts) >= 20):
                print(f"    OpenAI batch full ({len(openai_batch_texts)} texts, {openai_batch_token_count} tokens). Sending to OpenAI...")
                try:
                    resp = openai.embeddings.create(input=openai_batch_texts, model=self.embedding_model)
                    print(f"      Received {len(resp.data)} embeddings from OpenAI.")
                    
                    records_for_supabase_batch = []
                    for j, emb_data in enumerate(resp.data):
                        embedding_list = np.array(emb_data.embedding, dtype=np.float32).tolist()
                        original_meta = openai_batch_original_metadata[j]
                        original_text = openai_batch_texts[j]
                        records_for_supabase_batch.append({
                            'project_id': self.current_project_id,
                            'content': original_text,
                            'embedding': embedding_list,
                            'file_path': original_meta.get('file'),
                            'symbol_type': original_meta.get('type'),
                            'symbol_name': original_meta.get('name'),
                            'start_line': original_meta.get('start_line'),
                            'end_line': original_meta.get('end_line')
                        })
                    
                    if records_for_supabase_batch:
                        print(f"        Attempting to insert {len(records_for_supabase_batch)} records into Supabase...")
                        db_response = self.supabase.table(self.supabase_table_name).insert(records_for_supabase_batch).execute()
                        db_data = getattr(db_response, 'data', None)
                        db_error = getattr(db_response, 'error', None)
                        # Using more robust response checking from previous _store_embeddings
                        if db_data and not db_error:
                            actual_inserted = len(db_data)
                            total_inserted_count += actual_inserted
                            print(f"          Successfully inserted {actual_inserted} records.")
                        elif hasattr(db_response, 'count') and db_response.count is not None and not db_error:
                            actual_inserted = db_response.count
                            total_inserted_count += actual_inserted
                            print(f"          Successfully inserted {actual_inserted} records (via count).")
                        elif db_error:
                            total_failed_count += len(records_for_supabase_batch)
                            print(f"          Failed to insert Supabase batch. Error: {db_error}")
                        else: # Ambiguous success/failure
                            total_inserted_count += len(records_for_supabase_batch) # Assume success if no error
                            print(f"          Supabase batch processed (assumed success). Count: {len(records_for_supabase_batch)}")
                except Exception as e_openai:
                    print(f"    Error during OpenAI API call or Supabase insert for a batch: {e_openai}")
                    total_failed_count += len(openai_batch_texts)
                
                # Reset OpenAI batch
                openai_batch_texts = []
                openai_batch_original_metadata = []
                openai_batch_token_count = 0

            # Add current item to OpenAI batch
            openai_batch_texts.append(current_text)
            openai_batch_original_metadata.append(current_metadata)
            openai_batch_token_count += current_tokens

        # Process the final remaining OpenAI batch (if any)
        if openai_batch_texts:
            print(f"    Processing final OpenAI batch ({len(openai_batch_texts)} texts, {openai_batch_token_count} tokens). Sending to OpenAI...")
            try:
                resp = openai.embeddings.create(input=openai_batch_texts, model=self.embedding_model)
                print(f"      Received {len(resp.data)} embeddings from OpenAI for final batch.")
                records_for_supabase_batch = []
                for j, emb_data in enumerate(resp.data):
                    embedding_list = np.array(emb_data.embedding, dtype=np.float32).tolist()
                    original_meta = openai_batch_original_metadata[j]
                    original_text = openai_batch_texts[j]
                    records_for_supabase_batch.append({
                        'project_id': self.current_project_id,
                        'content': original_text,
                        'embedding': embedding_list,
                        'file_path': original_meta.get('file'),
                        'symbol_type': original_meta.get('type'),
                        'symbol_name': original_meta.get('name'),
                        'start_line': original_meta.get('start_line'),
                        'end_line': original_meta.get('end_line')
                    })
                
                if records_for_supabase_batch:
                    print(f"        Attempting to insert {len(records_for_supabase_batch)} records from final batch into Supabase...")
                    db_response = self.supabase.table(self.supabase_table_name).insert(records_for_supabase_batch).execute()
                    db_data = getattr(db_response, 'data', None)
                    db_error = getattr(db_response, 'error', None)
                    if db_data and not db_error:
                        actual_inserted = len(db_data)
                        total_inserted_count += actual_inserted
                        print(f"          Successfully inserted {actual_inserted} records (final batch).")
                    elif hasattr(db_response, 'count') and db_response.count is not None and not db_error:
                        actual_inserted = db_response.count
                        total_inserted_count += actual_inserted
                        print(f"          Successfully inserted {actual_inserted} records (final batch, via count).")
                    elif db_error:
                        total_failed_count += len(records_for_supabase_batch)
                        print(f"          Failed to insert final Supabase batch. Error: {db_error}")
                    else:
                        total_inserted_count += len(records_for_supabase_batch)
                        print(f"          Final Supabase batch processed (assumed success). Count: {len(records_for_supabase_batch)}")
            except Exception as e_openai_final:
                print(f"    Error during final OpenAI API call or Supabase insert: {e_openai_final}")
                total_failed_count += len(openai_batch_texts)

        return total_inserted_count, total_failed_count

    # Note: The search functionality (if you had one using FAISS) would also need to be rewritten
    # to query Supabase using its vector search capabilities (e.g., using a stored procedure/function). 