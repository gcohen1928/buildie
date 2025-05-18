import os
import sys
from pathlib import Path
from dotenv import load_dotenv
load_dotenv()

# Ensure relative import works whether run from project root or ingest dir
try:
    from app.ingest.indexer import RepoIndexer  # type: ignore
except ModuleNotFoundError:
    # Fallback when script executed from inside api/app/ingest
    from indexer import RepoIndexer  # type: ignore

def main():
    if len(sys.argv) > 1:
        repo_url = sys.argv[1]
    else:
        # Default repo to ingest if none supplied
        repo_url = "https://github.com/gcohen1928/buildie"

    print(f"[test_ingest] Ingesting repo: {repo_url}\n")

    # Check env vars
    missing = []
    for var in ("OPENAI_API_KEY", "SUPABASE_URL", "SUPABASE_KEY"):
        if not os.getenv(var):
            missing.append(var)
    if missing:
        print(f"Missing environment variables: {', '.join(missing)}")
        print("Set them before running this script.")
        sys.exit(1)

    # Run indexing
    indexer = RepoIndexer()
    success = indexer.index_repo(repo_url)
    if success:
        print("✅ Ingestion complete.")
    else:
        print("❌ Ingestion failed.")


if __name__ == "__main__":
    main() 