import os
from supabase import create_client, Client
from typing import Optional, Dict, Any, List
from pydantic import HttpUrl

# Initialize Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY") # Use the service role key for backend operations

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Supabase URL and Key must be set in environment variables.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- User Operations ---
async def get_or_create_user(github_user_id: Optional[int] = None, github_username: Optional[str] = None, email: Optional[str] = None, name: Optional[str] = None, avatar_url: Optional[str] = None) -> Dict[str, Any]:
    """
    Retrieves an existing user or creates a new one.
    Prioritizes github_user_id for lookup, then github_username.
    """
    if not github_user_id and not github_username:
        raise ValueError("Either github_user_id or github_username must be provided.")

    table = "users"
    user_data = None
    
    if github_user_id:
        response = supabase.table(table).select("*").eq("github_user_id", github_user_id).execute()
        if response.data:
            user_data = response.data[0]
    
    if not user_data and github_username:
        response = supabase.table(table).select("*").eq("github_username", github_username).execute()
        if response.data:
            user_data = response.data[0]

    if user_data:
        # Optionally update user info if new details are provided
        update_payload = {}
        if email and user_data.get("email") != email:
            update_payload["email"] = email
        if name and user_data.get("name") != name:
            update_payload["name"] = name
        if avatar_url and user_data.get("avatar_url") != avatar_url:
            update_payload["avatar_url"] = avatar_url
        if github_username and user_data.get("github_username") != github_username: # if looked up by ID but username changed
            update_payload["github_username"] = github_username
        if github_user_id and user_data.get("github_user_id") != github_user_id: # if looked up by username but ID is now available
             update_payload["github_user_id"] = github_user_id

        if update_payload:
            update_payload["updated_at"] = "now()"
            response = supabase.table(table).update(update_payload).eq("id", user_data["id"]).execute()
            if response.data:
                return response.data[0]
        return user_data

    # Create new user
    insert_payload = {
        "github_user_id": github_user_id,
        "github_username": github_username,
        "email": email,
        "name": name,
        "avatar_url": avatar_url
    }
    # Filter out None values before insert
    insert_payload = {k: v for k, v in insert_payload.items() if v is not None}

    response = supabase.table(table).insert(insert_payload).execute()
    if response.data:
        return response.data[0]
    else:
        err = getattr(response, 'error', 'Unknown error (attribute missing)')
        print(f"Error creating user: {err}")
        raise Exception(f"Could not create user: {err}")


# --- Project Operations ---
async def get_or_create_project(
    github_repo_id: int, 
    full_name: str, 
    name: str,
    html_url: Optional[HttpUrl] = None, 
    description: Optional[str] = None, 
    private: bool = False,
    user_id: Optional[str] = None # UUID of the user who added/owns this project link
) -> Dict[str, Any]:
    """
    Retrieves an existing project or creates a new one based on github_repo_id.
    """
    table = "projects"
    response = supabase.table(table).select("*").eq("github_repo_id", github_repo_id).execute()
    
    if response.data:
        project_data = response.data[0]
        # Optionally update if details changed
        update_payload = {}
        if full_name and project_data.get("full_name") != full_name:
            update_payload["full_name"] = full_name
        if name and project_data.get("name") != name:
            update_payload["name"] = name
        if html_url and project_data.get("html_url") != str(html_url):
            update_payload["html_url"] = str(html_url)
        if description and project_data.get("description") != description:
            update_payload["description"] = description
        if project_data.get("private") != private: # Boolean comparison
            update_payload["private"] = private
        if user_id and project_data.get("user_id") != user_id: # if user_id is provided and different
            update_payload["user_id"] = user_id
        
        if update_payload:
            update_payload["updated_at"] = "now()"
            update_response = supabase.table(table).update(update_payload).eq("id", project_data["id"]).execute()
            if update_response.data:
                return update_response.data[0]
        return project_data

    insert_payload = {
        "github_repo_id": github_repo_id,
        "full_name": full_name,
        "name": name,
        "html_url": str(html_url) if html_url else None,
        "description": description,
        "private": private,
        "user_id": user_id
    }
    insert_payload = {k: v for k, v in insert_payload.items() if v is not None}
    
    insert_response = supabase.table(table).insert(insert_payload).execute()
    if insert_response.data:
        return insert_response.data[0]
    else:
        err = getattr(insert_response, 'error', 'Unknown error (attribute missing)')
        print(f"Error creating project: {err}")
        raise Exception(f"Could not create project: {err}")

# --- Commit Operations ---
async def store_raw_event_data(event_type: str, delivery_id: str, repo_full_name: str, entity_id: str, payload: Dict[str, Any]):
    """
    Stores raw event data, useful for auditing or delayed processing.
    This is a placeholder/example. You'll want more structured storage.
    For now, we can imagine a simple 'raw_events' table or just print.
    This function name was used in the webhook, so we implement it.
    """
    # In a real scenario, you'd insert this into a 'raw_events' table.
    # For now, we'll just print and acknowledge it.
    # This function isn't directly inserting into the 'commits' table yet as per its name.
    # The `process_github_commit_data` in `diff_processor` will call a more specific store_commit function.
    print(f"EVENT STORED (simulation): Type: {event_type}, Delivery: {delivery_id}, Repo: {repo_full_name}, Entity ID: {entity_id}")
    # Example:
    # try:
    #     supabase.table("raw_events").insert({
    #         "event_type": event_type,
    #         "delivery_id": delivery_id,
    #         "repo_full_name": repo_full_name,
    #         "entity_id": entity_id, # e.g., commit SHA or issue ID
    #         "payload": payload,
    #         "received_at": "now()"
    #     }).execute()
    # except Exception as e:
    #     print(f"Error storing raw event: {e}")
    pass # Placeholder

async def store_commit_details(
    project_id: str, # UUID of the project
    commit_sha: str,
    message: Optional[str],
    commit_timestamp: str, # Assuming ISO format string
    compare_url: Optional[str],
    author_name: Optional[str],
    author_email: Optional[str],
    author_github_username: Optional[str],
    committer_name: Optional[str],
    committer_email: Optional[str],
    committer_github_username: Optional[str],
    pusher_name: Optional[str],
    pusher_email: Optional[str],
    diff_text: Optional[str],
    raw_commit_payload: Dict[str, Any],
    raw_push_event_payload: Optional[Dict[str, Any]] = None,
    changed_files: Optional[List[Dict[str, str]]] = None
) -> Dict[str, Any]:
    """
    Stores detailed commit information, including linked files.
    LLM analysis fields (change_summary, is_feature_shipped) have been removed.
    """
    commit_payload = {
        "project_id": project_id,
        "commit_sha": commit_sha,
        "message": message,
        "commit_timestamp": commit_timestamp,
        "compare_url": str(compare_url) if compare_url else None,
        "author_name": author_name,
        "author_email": author_email,
        "author_github_username": author_github_username,
        "committer_name": committer_name,
        "committer_email": committer_email,
        "committer_github_username": committer_github_username,
        "pusher_name": pusher_name,
        "pusher_email": pusher_email,
        "diff_text": diff_text,
        "raw_commit_payload": raw_commit_payload,
        "raw_push_event_payload": raw_push_event_payload
    }
    # Filter out None values for fields that are not explicitly nullable in DB or have defaults
    commit_payload_cleaned = {k: v for k, v in commit_payload.items() if v is not None}

    # Check if commit already exists
    select_response = supabase.table("commits").select("id").eq("project_id", project_id).eq("commit_sha", commit_sha).execute()
    
    db_operation_response = None # To store response from insert or update

    if select_response.data: # Commit exists, update it
        print(f"Commit {commit_sha} already exists for project {project_id}. Updating.")
        commit_id_to_use = select_response.data[0]["id"]
        db_operation_response = supabase.table("commits").update(commit_payload_cleaned).eq("id", commit_id_to_use).execute()
    else: # Commit does not exist (or select failed)
        # Check if the select operation itself had an error
        select_error = getattr(select_response, 'error', None)
        if select_error:
            print(f"Error checking for existing commit: {select_error}")
            raise Exception(f"Failed to check for existing commit before insert: {select_error}")
        
        # If select was successful but found no data, proceed to insert
        print(f"Commit {commit_sha} does not exist for project {project_id}. Inserting.")
        db_operation_response = supabase.table("commits").insert(commit_payload_cleaned).execute()

    if db_operation_response and getattr(db_operation_response, 'data', None): # Check if data attribute exists and is not empty
        saved_commit = db_operation_response.data[0]
        commit_id_to_use = saved_commit["id"]

        if changed_files and commit_id_to_use:
            supabase.table("commit_files").delete().eq("commit_id", commit_id_to_use).execute() # Assuming delete always "succeeds" or doesn't need error check here for now
            
            files_to_insert = [
                {"commit_id": commit_id_to_use, "file_path": f["file_path"], "status": f["status"]}
                for f in changed_files
            ]
            if files_to_insert:
                files_response = supabase.table("commit_files").insert(files_to_insert).execute()
                files_error = getattr(files_response, 'error', None)
                if files_error:
                    print(f"Error storing commit files: {files_error}")
                    # Decide on error handling: raise, or just log and return saved_commit?
                    # For now, just logging.
        return saved_commit
    else: # db_operation_response might be None or its data is empty
        err_detail = "Unknown error or no data returned from database operation."
        if db_operation_response:
            err_detail = getattr(db_operation_response, 'error', 'No data returned and error attribute missing.')
        
        error_message = f"Error saving commit {commit_sha} to project {project_id}: {err_detail}"
        print(error_message)
        # Check the status code if available for more context
        status_code = getattr(db_operation_response, 'status_code', getattr(db_operation_response, 'status', 'N/A')) # 'status' for postgrest-py
        print(f"DB operation status code: {status_code}")
        raise Exception(error_message)

async def get_commit_by_sha(project_id: str, commit_sha: str) -> Optional[Dict[str, Any]]:
    """Retrieves a specific commit by its SHA for a given project."""
    response = supabase.table("commits").select("*").eq("project_id", project_id).eq("commit_sha", commit_sha).maybe_single().execute()
    return response.data if response.data else None

# --- Helper to get project by full name ---
async def get_project_by_full_name(repo_full_name: str) -> Optional[Dict[str, Any]]:
    response = supabase.table("projects").select("id, github_repo_id").eq("full_name", repo_full_name).maybe_single().execute()
    return response.data if response.data else None 