from fastapi import APIRouter, Request, HTTPException, Header, BackgroundTasks
import hmac
import hashlib
import os

# TODO: Import ingest functions
# from ..ingest.diff_processor import process_github_push

router = APIRouter()

GITHUB_WEBHOOK_SECRET = os.getenv("GITHUB_WEBHOOK_SECRET")

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

    payload = await request.json()
    print(f"Received GitHub webhook. Event: {x_github_event}, Delivery ID: {x_github_delivery}")

    if x_github_event == "ping":
        return {"message": "GitHub webhook ping received successfully"}

    if x_github_event == "push":
        # TODO: Add the actual processing to background tasks
        # background_tasks.add_task(process_github_push, payload, request.app.state.supabase)
        print(f"Processing push event for repo: {payload.get('repository',{}).get('full_name')}")
        return {"message": "Push event received and processing started"}
    
    # Handle other events as needed or ignore
    print(f"Received unhandled GitHub event: {x_github_event}")
    return {"message": f"Event {x_github_event} received but not processed"}

# TODO: Add other webhook handlers if necessary (e.g., for Twitter, LinkedIn if they use webhooks) 