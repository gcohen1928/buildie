import asyncio
import os
# Adjust the import path if your test_indexer.py is not in api/app/ingest/
# If test_indexer.py is in the project root (alongside the 'api' folder), use:
# from api.app.ingest.indexer import RepoIndexer
# If it's in api/app/ingest/, use:
from indexer import RepoIndexer

# Load OpenAI API key from .env if not already set
def load_env():
    from dotenv import load_dotenv
    load_dotenv()
    if not os.getenv('OPENAI_API_KEY'):
        raise RuntimeError('OPENAI_API_KEY not set in environment or .env')

async def main():
    load_env()
    indexer = RepoIndexer()

    # test_repo_url = "https://github.com/Srachuri-code/H2HApp" 
    test_repo_url = "https://github.com/psf/requests-html" # Using a different small repo for variety
    print(f"Indexing repo: {test_repo_url}")
    
    success = indexer.index_repo(test_repo_url)

    if success:
        print(f"Repo indexing process completed for {test_repo_url}.")
        print("Check your local Supabase 'code_embeddings' table for data and logs for details.")
        # The line below caused AttributeError and has been removed:
        # print(f"Number of chunks indexed: {len(indexer.metadata)}") 
    else:
        print(f"Failed to index {test_repo_url}.")

if __name__ == "__main__":
    asyncio.run(main()) 