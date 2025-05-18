from fastapi import APIRouter, Request, HTTPException, Header, BackgroundTasks
from pydantic import BaseModel, HttpUrl
from typing import List, Optional
import hmac
import hashlib
import os

# TODO: Import ingest functions
from ..ingest.diff_processor import process_github_commit_data
# TODO: Import Supabase client/service
from ..services.supabase_service import store_raw_event_data

router = APIRouter()

GITHUB_WEBHOOK_SECRET = os.getenv("GITHUB_WEBHOOK_SECRET")

# Pydantic Models for GitHub Push Event
class GitHubUser(BaseModel):
    name: str
    email: Optional[str] = None
    username: Optional[str] = None

class GitHubCommit(BaseModel):
    id: str
    message: str
    timestamp: str # Consider converting to datetime
    url: HttpUrl
    author: GitHubUser
    committer: GitHubUser
    added: List[str]
    removed: List[str]
    modified: List[str]

class GitHubRepository(BaseModel):
    id: int
    name: str
    full_name: str
    html_url: HttpUrl
    private: bool

class GitHubPusher(BaseModel):
    name: str
    email: Optional[str] = None

class GitHubPushEvent(BaseModel):
    ref: str
    before: str
    after: str
    repository: GitHubRepository
    pusher: GitHubPusher
    commits: List[GitHubCommit]
    head_commit: Optional[GitHubCommit] = None
    compare: HttpUrl # URL to compare changes

async def verify_signature(request: Request):
    """Verify the GitHub webhook signature."""
    if not GITHUB_WEBHOOK_SECRET:
        print("Warning: GITHUB_WEBHOOK_SECRET is not set. Skipping signature verification.")
        # In a production environment, you should raise an HTTPException or handle this strictly.
        # For local dev, you might allow it to proceed but with a warning.
        # raise HTTPException(status_code=500, detail="Webhook secret not configured.")
        return # Or raise error

    signature_header = request.headers.get("X-Hub-Signature-256")
    if not signature_header:
        raise HTTPException(status_code=400, detail="X-Hub-Signature-256 header is missing")

    body = await request.body()
    expected_signature = "sha256=" + hmac.new(GITHUB_WEBHOOK_SECRET.encode(), body, hashlib.sha256).hexdigest()

    if not hmac.compare_digest(expected_signature, signature_header):
        raise HTTPException(status_code=403, detail="Request signature mismatch")

@router.post("/github")
async def github_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_github_event: str = Header(None),
    x_github_delivery: str = Header(None),
    # signature: str = Depends(verify_signature) # Enable this once secret is set and tested
):
    """Receives GitHub push webhooks, verifies HMAC, and triggers ingestion.
    Ensure GITHUB_WEBHOOK_SECRET is set in your environment.
    """
    # Verify signature (manual call if Depends is commented out)
    try:
        await verify_signature(request) # Call verify_signature manually
    except HTTPException as e:
         # Log the error and return appropriate response
        print(f"Signature verification failed: {e.detail}")
        raise e

    raw_payload = await request.json() # Get raw payload first for logging if parsing fails
    print(f"Received GitHub webhook. Event: {x_github_event}, Delivery ID: {x_github_delivery}")

    if x_github_event == "ping":
        return {"message": "GitHub webhook ping received successfully"}

    if x_github_event == "push":
        try:
            push_event = GitHubPushEvent.model_validate(raw_payload)
        except Exception as e:
            print(f"Error parsing GitHub push event payload: {e}")
            raise HTTPException(status_code=422, detail=f"Error parsing push event: {e}")

        repo_name = push_event.repository.full_name
        pusher_name = push_event.pusher.name
        num_commits = len(push_event.commits)
        
        print(f"Processing push event for repo: {repo_name} by {pusher_name}. Commits: {num_commits}")

        for commit in push_event.commits:
            print(f"  Commit ID: {commit.id}")
            print(f"  Message: {commit.message}")
            print(f"  Timestamp: {commit.timestamp}")
            print(f"  Author: {commit.author.name}")
            print(f"  Modified files: {commit.modified}")

            # The logic for feature completion detection (previously is_feature_complete)
            # and subsequent call to send_feature_completion_email should now be handled
            # within the 'process_github_commit_data' function.
            # 'process_github_commit_data' would use an LLM to determine if a feature
            # is complete based on commit.message and other relevant data.
            # If complete, it would then call:
            #
            # await send_feature_completion_email(
            #     project_name=push_event.repository.full_name,
            #     feature_name="GitHub Repository Import and Codebase Indexing Feature",
            #     recipient_email=DESIGNATED_EMAIL_ADDRESS
            # )
            #
            # This keeps the webhook handler cleaner and centralizes the complex processing.

            # TODO: M1.4 - Store commit data in Supabase
            # For now, let's store the raw event for later processing or audit
            background_tasks.add_task(store_raw_event_data, x_github_event, x_github_delivery, push_event.repository.full_name, commit.id, raw_payload) # Example call
            
            # TODO: M1.3 - Trigger diff processing for this commit
            # This function would handle fetching diff, LLM calls, and structured data storage
            background_tasks.add_task(
                process_github_commit_data,
                commit_payload=commit.model_dump(mode='json'), # Ensure JSON serializable
                repository_payload=push_event.repository.model_dump(mode='json'), # Ensure JSON serializable
                compare_url=str(push_event.compare),
                pusher_payload=push_event.pusher.model_dump(mode='json') # Ensure JSON serializable
            )
            
        print(f"Finished initial processing of push event for {repo_name}")
        return {"message": f"Push event for {repo_name} received and processing started for {num_commits} commit(s)"}
    
    # Handle other events as needed or ignore
    print(f"Received unhandled GitHub event: {x_github_event}")
    return {"message": f"Event {x_github_event} received but not processed"}

# TODO: Add other webhook handlers if necessary (e.g., for Twitter, LinkedIn if they use webhooks) 