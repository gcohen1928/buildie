import os
from indexer import RepoIndexer

# Load OpenAI API key from .env if not already set
def load_env():
    from dotenv import load_dotenv
    load_dotenv()
    if not os.getenv('OPENAI_API_KEY'):
        raise RuntimeError('OPENAI_API_KEY not set in environment or .env')

if __name__ == "__main__":
    load_env()
    repo_url = "https://github.com/Srachuri-code/H2HApp"  # Your repo
    indexer = RepoIndexer()
    print(f"Indexing repo: {repo_url}")
    success = indexer.index_repo(repo_url)
    if success:
        print("Indexing complete!")
        print(f"Number of chunks indexed: {len(indexer.metadata)}")
        if indexer.metadata:
            print("Sample chunk metadata:")
            print(indexer.metadata[0])
        print(f"FAISS index file exists: {os.path.exists(indexer.vector_db_path)}")
        print(f"Metadata file exists: {os.path.exists(indexer.vector_db_path + '.meta')}")
    else:
        print("Indexing failed.") 