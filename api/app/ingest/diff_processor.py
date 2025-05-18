import httpx # For making HTTP requests to get diff
import os
from typing import Dict, Any, Optional, List

# Assuming your Pydantic models from webhook.py are accessible or redefined here for type hinting
# For simplicity, let's assume they are passed as dicts initially
# from ..routes.webhook import GitHubCommit, GitHubRepository, GitHubPusher # Adjust path as needed

from ..services import supabase_service # Import the Supabase service
# Placeholder for LLM utility functions
# from ..core import llm_utils 

# Environment variables for LLM provider (example)
# OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

async def get_commit_diff(repo_html_url: str, commit_sha: str) -> Optional[str]:
    """Fetches the diff for a given commit SHA from its .diff URL."""
    diff_url = f"{repo_html_url}/commit/{commit_sha}.diff"
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(diff_url)
            response.raise_for_status() # Raise an exception for bad status codes (4xx or 5xx)
            return response.text
        except httpx.HTTPStatusError as e:
            print(f"Error fetching diff from {diff_url}: {e}")
            # Optionally, handle specific statuses differently, e.g., 404 means commit not found or repo private
        except httpx.RequestError as e:
            print(f"Request error fetching diff from {diff_url}: {e}")
    return None

async def analyze_changes_with_llm(diff_text: str, commit_message: str) -> Dict[str, Any]:
    """ 
    Placeholder for LLM analysis to get a summary and feature shipment flag.
    """
    # TODO: Implement actual LLM calls here
    # if not OPENAI_API_KEY:
    #     print("Warning: OPENAI_API_KEY not set. Skipping LLM analysis.")
    #     return {"summary": "LLM analysis skipped.", "is_feature_shipped": None}

    print("LLM: Simulating change summary generation...")
    summary = f"Summary based on commit: '{commit_message[:50]}...' and diff length: {len(diff_text)}"
    
    print("LLM: Simulating feature shipment analysis...")
    # Basic heuristic: if 'feature' or 'feat' is in commit message, or diff is large
    is_feature = None
    if diff_text: # Only attempt if diff is available
        is_feature = "feature" in commit_message.lower() or "feat" in commit_message.lower() or len(diff_text) > 1000 # Arbitrary threshold

    # Example call to a hypothetical LLM utility:
    # summary = await llm_utils.generate_summary(diff_text, commit_message)
    # is_feature_shipped = await llm_utils.check_feature_shipped(diff_text, commit_message, summary)
    
    return {"change_summary": summary, "is_feature_shipped": is_feature}

async def process_github_commit_data(
    commit_payload: Dict[str, Any], 
    repository_payload: Dict[str, Any],
    pusher_payload: Dict[str, Any],
    compare_url: str # Direct compare URL from the push event
):
    """
    Processes a single commit: fetches diff, (optionally) analyzes with LLM,
    and stores data in Supabase.
    This function is intended to be called as a background task.
    """
    print(f"Processing commit: {commit_payload.get('id')} for repo: {repository_payload.get('full_name')}")

    # 1. Get or Create Project in Supabase
    # The `user_id` for the project could be determined by the app installation or a default system user
    # For now, we'll leave it as None or you can associate it with the pusher if appropriate.
    
    # Try to get user who pushed the changes, if their GitHub username is available
    pusher_github_username = pusher_payload.get("name") # GitHub uses 'name' for username in pusher context sometimes
    # Or pusher_payload.get("username") if that's what your model/data has
    project_owner_user_id = None
    if pusher_github_username:
        try:
            # Assuming the pusher is a user in our system
            pusher_user = await supabase_service.get_or_create_user(github_username=pusher_github_username, email=pusher_payload.get("email"))
            project_owner_user_id = pusher_user.get("id") if pusher_user else None
        except Exception as e:
            print(f"Error getting or creating pusher user {pusher_github_username}: {e}")
            # Decide if this is critical or if processing can continue without associating the project to a user

    project = await supabase_service.get_or_create_project(
        github_repo_id=repository_payload["id"],
        full_name=repository_payload["full_name"],
        name=repository_payload["name"],
        html_url=repository_payload.get("html_url"),
        description=repository_payload.get("description"),
        private=repository_payload.get("private", False),
        user_id=project_owner_user_id # Link project to the user who pushed (or who installed the app)
    )
    if not project or not project.get("id"):
        print(f"Error: Could not get or create project for {repository_payload['full_name']}. Aborting commit processing.")
        return
    
    project_id = project["id"]

    # 2. Get or Create Author and Committer as Users (if distinct and info available)
    # GitHub commit payload has author and committer objects, which might be different from the pusher.
    author_info = commit_payload.get("author", {})
    committer_info = commit_payload.get("committer", {})

    # Note: GitHub API might provide 'username' in author/committer, or you might need to look it up.
    # For this example, we use the name/email from the commit, which might not directly map to a GitHub login.
    # A more robust solution might involve looking up GitHub users by email if available and verified.
    try:
        author_user = await supabase_service.get_or_create_user(
            github_username=author_info.get("username"), # This field is often present
            email=author_info.get("email"),
            name=author_info.get("name")
        )
    except Exception as e:
        print(f"Warning: Could not get/create author user {author_info.get('username') or author_info.get('name')}: {e}")
        author_user = None # Continue without linking to a user if creation fails

    try:
        committer_user = await supabase_service.get_or_create_user(
            github_username=committer_info.get("username"),
            email=committer_info.get("email"),
            name=committer_info.get("name")
        )
    except Exception as e:
        print(f"Warning: Could not get/create committer user {committer_info.get('username') or committer_info.get('name')}: {e}")
        committer_user = None

    # 3. Fetch the Diff
    # The webhook payload (commit object) does not contain the diff itself.
    # We need to fetch it using the commit SHA and repo URL.
    diff_text = await get_commit_diff(repo_html_url=repository_payload["html_url"], commit_sha=commit_payload["id"])
    
    if diff_text is None:
        print(f"Warning: Could not fetch diff for commit {commit_payload['id']}. Proceeding without it.")
        # Decide if you want to store the commit record even if diff is missing.

    # 4. LLM Analysis (Placeholder)
    llm_analysis_results = {"change_summary": None, "is_feature_shipped": None}
    if diff_text: # Only run LLM if diff is available
        llm_analysis_results = await analyze_changes_with_llm(diff_text, commit_payload.get("message", ""))
    else:
        # Fallback if no diff: try to get some summary from message only, or mark as not analyzed
        llm_analysis_results["change_summary"] = f"Summary based on commit message: {commit_payload.get('message', 'N/A')[:100]}... (Diff not available)"
        llm_analysis_results["is_feature_shipped"] = None # Cannot determine without diff usually

    # 5. Prepare list of changed files
    changed_files_data = []
    for status_type in ["added", "removed", "modified"]:
        for file_path in commit_payload.get(status_type, []):
            changed_files_data.append({"file_path": file_path, "status": status_type})

    # 6. Store Commit Details in Supabase
    try:
        await supabase_service.store_commit_details(
            project_id=project_id,
            commit_sha=commit_payload["id"],
            message=commit_payload.get("message"),
            commit_timestamp=commit_payload.get("timestamp"),
            compare_url=compare_url, # This is the compare URL for the whole push, not specific to one commit if many
            
            author_name=author_info.get("name"),
            author_email=author_info.get("email"),
            author_github_username=author_info.get("username"), # if available in payload
            
            committer_name=committer_info.get("name"),
            committer_email=committer_info.get("email"),
            committer_github_username=committer_info.get("username"),

            pusher_name=pusher_payload.get("name"), # This often is the github username
            pusher_email=pusher_payload.get("email"),
            
            diff_text=diff_text,
            change_summary=llm_analysis_results.get("change_summary"),
            is_feature_shipped=llm_analysis_results.get("is_feature_shipped"),
            
            raw_commit_payload=commit_payload, # Store the original commit part of the payload
            # raw_push_event_payload= The full push event might be too large or redundant here if webhook already stored it raw
            changed_files=changed_files_data
        )
        print(f"Successfully processed and stored commit {commit_payload['id']}")
    except Exception as e:
        print(f"Error storing commit details for {commit_payload['id']}: {e}")
        # Consider retry mechanisms or dead-letter queues for background tasks

# Example of how you might call this (e.g., from a test or another service)
# if __name__ == "__main__":
#     import asyncio
#     # Mock data similar to what the webhook would provide after Pydantic parsing
#     mock_commit = {
#         "id": "testsha123", "message": "feat: Implement amazing new feature", "timestamp": "2023-10-26T10:00:00Z",
#         "author": {"name": "Test Author", "email": "author@example.com", "username": "testauthor"},
#         "committer": {"name": "Test Committer", "email": "committer@example.com", "username": "testcommitter"},
#         "added": ["new_feature.py"], "removed": [], "modified": ["main.py"]
#     }
#     mock_repo = {
#         "id": 12345, "name": "my-repo", "full_name": "testuser/my-repo", 
#         "html_url": "https://github.com/testuser/my-repo", "private": False
#     }
#     mock_pusher = {"name": "testpusher", "email": "pusher@example.com"}
#     mock_compare_url = "https://github.com/testuser/my-repo/compare/oldsha...newsha"

#     # Ensure SUPABASE_URL and SUPABASE_SERVICE_KEY are set in your environment
#     # You'd also need your Supabase local dev instance running (supabase start)
#     asyncio.run(process_github_commit_data(mock_commit, mock_repo, mock_pusher, mock_compare_url)) 