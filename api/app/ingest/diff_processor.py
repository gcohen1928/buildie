import httpx # For making HTTP requests to get diff
import os
from typing import Dict, Any, Optional, List
# import openai # OpenAI no longer needed
import uuid

# Assuming your Pydantic models from webhook.py are accessible or redefined here for type hinting
# For simplicity, let's assume they are passed as dicts initially
# from ..routes.webhook import GitHubCommit, GitHubRepository, GitHubPusher # Adjust path as needed

from ..services import supabase_service # Import the Supabase service
# Placeholder for LLM utility functions
# from ..core import llm_utils 

# Import email sending utility and config from the new core.email_utils module
from ..core.email_utils import send_feature_completion_email, DESIGNATED_EMAIL_ADDRESS

# Environment variables for LLM provider
# if os.getenv("OPENAI_API_KEY"):
#     openai.api_key = os.getenv("OPENAI_API_KEY")
# else: # No longer print warning here as the function is removed
#     print("Warning: OPENAI_API_KEY is not set. LLM analysis will be skipped.")

# Recommended: Initialize client outside function if it's to be reused
# However, for background tasks that might run in separate processes, initializing per call can be safer.
# client = openai.AsyncOpenAI() # if using openai > v1.0.0

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

async def determine_feature_completion_and_name_llm(commit_message: str, diff_text: Optional[str]) -> Optional[str]:
    """
    (Placeholder) Simulates an LLM call to determine if a commit completes a feature
    and extracts a name for that feature.

    In a real implementation, this would involve:
    - Formatting a prompt with the commit message, diff, and potentially other context.
    - Calling an LLM API (e.g., OpenAI, Anthropic, a local model via Ollama).
    - Parsing the LLM's response to determine:
        1. Is the feature considered complete? (boolean)
        2. If yes, what is a concise name/description for the feature? (string)
    - Handling potential errors, rate limits, etc.
    """
    print("\n--- Placeholder LLM Feature Completion Check ---")
    print(f"Analyzing commit message: \"{commit_message}\"")
    # print(f"Analyzing diff (first 100 chars): {diff_text[:100] if diff_text else 'No diff'}")

    # Basic heuristic for placeholder - replace with actual LLM call
    # This is NOT robust.
    feature_name = None
    first_line = commit_message.split('\n')[0].lower()
    
    completion_keywords = ["complete", "finish", "implement", "resolve", "add", "create", "deliver"]
    feature_prefixes = ["feat:", "feature:", "fix:", "story:", "task:"]

    is_feature_commit = any(first_line.startswith(prefix) for prefix in feature_prefixes)
    indicates_completion = any(keyword in first_line for keyword in completion_keywords)

    if is_feature_commit and indicates_completion:
        # Try to extract a name (very naive)
        # e.g., "feat: Implement user login" -> "Implement user login"
        for prefix in feature_prefixes:
            if first_line.startswith(prefix):
                feature_name = commit_message.split('\n')[0][len(prefix):].strip()
                # Further cleanup very basic completion words from the end if they are there
                for kw in completion_keywords:
                    if feature_name.lower().endswith(f" {kw}"):
                        feature_name = feature_name[:-(len(kw)+1)].strip()
                    elif feature_name.lower() == kw: # if the message was just "feat: complete"
                         feature_name = "Completed feature" # fallback
                break
        if not feature_name: # If only prefix was found, but no clear name after it
             feature_name = commit_message.split('\n')[0]


    if feature_name:
        print(f"LLM Placeholder: YES, feature '{feature_name}' seems complete.")
    else:
        print("LLM Placeholder: NO, feature does not seem complete based on simple heuristics.")
    print("--- End Placeholder LLM ---")
    return feature_name

async def process_github_commit_data(
    commit_payload: Dict[str, Any], 
    repository_payload: Dict[str, Any],
    pusher_payload: Dict[str, Any],
    compare_url: str # Direct compare URL from the push event
):
    """
    Processes a single commit: fetches diff and stores data in Supabase.
    LLM analysis has been removed.
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
            
            raw_commit_payload=commit_payload, # Store the original commit part of the payload
            # raw_push_event_payload= The full push event might be too large or redundant here if webhook already stored it raw
            changed_files=changed_files_data
        )
        print(f"Successfully processed and stored commit {commit_payload['id']}")
    except Exception as e:
        print(f"Error during Supabase store_commit_details for {commit_payload['id']}: {e}")
        # Optionally, re-raise or handle more gracefully depending on desired behavior
        raise # Re-raise the exception to halt further processing for this commit if storing fails

    # After successfully storing commit, check for feature completion
    # and send email if applicable.
    completed_feature_name = None
    project_full_name = repository_payload.get("full_name", "Unknown Project")
    try:
        commit_message = commit_payload.get("message", "")
        completed_feature_name = await determine_feature_completion_and_name_llm(commit_message, diff_text)

        # TEMPORARY: Always attempt to send email for testing, using a default feature name if LLM doesn't provide one.
        # REMOVE/REVERT this block for production to only send emails for actual completed features.
        if not completed_feature_name:
            commit_id_short = commit_payload.get('id', 'unknown_commit')[:7]
            completed_feature_name = f"GitHub Repository Import and Codebase Indexing Feature (commit: {commit_id_short})" # Default for testing
            print(f"LLM (placeholder) did not identify a completed feature. Using default '{completed_feature_name}' for email testing.")
        else:
            print(f"Feature '{completed_feature_name}' deemed complete by LLM (placeholder) for project {project_full_name}.")
    except Exception as e:
        print(f"Error during feature completion check (determine_feature_completion_and_name_llm) for {commit_payload['id']}: {e}")
        raise # Re-raise

    try:
        if completed_feature_name: # Ensure we have a feature name before trying to send
            print(f"Proceeding to send feature completion email for '{completed_feature_name}' in project {project_full_name}.")
            await send_feature_completion_email(
                project_id=project_id,
                project_name=project_full_name,
                feature_name=completed_feature_name,
                recipient_email=DESIGNATED_EMAIL_ADDRESS
            )
        else:
            # This case might occur if determine_feature_completion_and_name_llm itself errored and completed_feature_name remained None
            # or if the temporary block logic was changed.
            print(f"Skipping email for commit {commit_payload['id']} as no feature name was determined (possibly due to an earlier error).")
    except Exception as e:
        print(f"Error during send_feature_completion_email for {commit_payload['id']} (feature: '{completed_feature_name}'): {e}")
        raise # Re-raise

    # Original logic (commented out for now during temporary always-send test):
    # if completed_feature_name:
    #     project_full_name = repository_payload.get("full_name", "Unknown Project")
    #     print(f"Feature '{completed_feature_name}' deemed complete by LLM (placeholder) for project {project_full_name}. Triggering email.")
    #     await send_feature_completion_email(
    #         project_name=project_full_name,
    #         feature_name=completed_feature_name,
    #         recipient_email=DESIGNATED_EMAIL_ADDRESS
    #     )
    # else:
    #     print(f"Commit {commit_payload['id']} did not signify feature completion according to LLM (placeholder).")

    # except Exception as e:
    #     print(f"Error storing commit details for {commit_payload['id']} or during feature completion check/email: {e}")
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

# The erroneously added process_historical_commits function is removed from this file.
# def process_historical_commits(
#     repo_path: str,
#     project_name: Optional[str] = None, 
#     project_full_name: Optional[str] = None, 
#     project_description: Optional[str] = None, 
#     project_private: Optional[bool] = False, 
#     project_owner_user_id: Optional[uuid.UUID] = None,
#     existing_commit_shas: Optional[set] = None
# ) -> int:
#     """
#     Clones a Git repository, iterates through its commit history,
#     fetches diffs, (optionally) performs LLM analysis, and stores details in Supabase.
#     """
#     # Implementation of process_historical_commits function
#     # This function is not provided in the original file or the code block
#     # It's assumed to exist as it's called in the process_github_commit_data function
#     # The implementation details are not provided in the original file or the code block
#     # This function should return the number of commits processed
#     return 0  # Placeholder return, actual implementation needed

#     # Example usage:
#     # process_historical_commits(
#     #     repo_path="path/to/your/repo",
#     #     project_name="My Project",
#     #     project_full_name="User/My-Project",
#     #     project_description="A description of the project",
#     #     project_private=False,
#     #     project_owner_user_id=uuid.UUID(int=1),
#     #     existing_commit_shas={"sha1", "sha2"}
#     # ) 