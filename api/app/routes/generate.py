from fastapi import APIRouter, Request, HTTPException, Body, BackgroundTasks
from pydantic import BaseModel
import uuid

# TODO: Import LangGraph agent runner
# from ..agents.graph_runner import run_agent_graph # Assuming you have a runner function
# TODO: Import event streaming manager if events are directly triggered from here
# from .events import manager as event_manager

router = APIRouter()

class GenerateRequest(BaseModel):
    project_id: str # Or repository identifier
    commits: list[str] # List of commit SHAs or relevant identifiers
    # TODO: Add other relevant fields like user query, feature selection, etc.
    user_prompt: str | None = None

class GenerateResponse(BaseModel):
    job_id: str
    message: str

# New Response model for the demo
class DemoGenerateResponse(BaseModel):
    project_id: str
    user_prompt: str | None
    tweet_thread: list[str] # List of tweets
    job_id: str # Keep job_id for consistency with potential UI expectations

# This will be the main function called by the /generate endpoint
async def process_generation_request(job_id: str, project_id: str, commits: list[str], user_prompt: str | None, request: Request):
    """Placeholder for the main LangGraph agent execution logic."""
    print(f"Job [{job_id}]: Starting generation for project {project_id}, commits: {commits}")
    # TODO: Get Supabase client: supabase = request.app.state.supabase
    # TODO: Get OpenAI API Key: openai_api_key = os.getenv("OPENAI_API_KEY")

    # 1. Retrieve relevant chunks from Supabase pgvector
    #    - Query based on project_id, commits, and potentially user_prompt embeddings
    #    - retrieved_chunks = await retrieve_code_chunks(supabase, project_id, commits, user_prompt)
    print(f"Job [{job_id}]: (Placeholder) Retrieving code chunks...")

    # 2. Initialize LangGraph agent
    #    - Pass Supabase client, OpenAI key, event_manager (for streaming), job_id
    #    - lang_graph_agent = initialize_lang_graph_agent(supabase, openai_api_key, event_manager, job_id)
    print(f"Job [{job_id}]: (Placeholder) Initializing LangGraph agent...")

    # 3. Run the LangGraph agent
    #    - The agent will handle: retrieving full diffs (GitHub tool), video recording (Playwright tool),
    #      drafting posts, and streaming events.
    #    - agent_inputs = {"retrieved_chunks": retrieved_chunks, "user_prompt": user_prompt, ...}
    #    - final_drafts = await lang_graph_agent.invoke(agent_inputs)
    print(f"Job [{job_id}]: (Placeholder) Running LangGraph agent...")

    # 4. Store results (e.g., draft content, video URLs) if not handled by the agent
    #    - This might be done within the agent itself or here.
    print(f"Job [{job_id}]: (Placeholder) Storing results...")

    # 5. Notify client of completion (e.g., via WebSocket if not streamed throughout)
    # await event_manager.send_personal_message({"type": "job_complete", "job_id": job_id, "status": "success"}, websocket_to_notify_if_not_global_stream_for_job_id)
    print(f"Job [{job_id}]: Generation process completed.")
    # This function runs in the background, so it doesn't return to the HTTP client directly.


@router.post("/demo", response_model=DemoGenerateResponse) # New endpoint for demo
async def start_generation_job_demo(
    request: Request,
    payload: GenerateRequest = Body(...),
):
    """DEMO: Kicks off a mock agent to generate content and returns it directly."""
    job_id = str(uuid.uuid4()) # Still generate a job_id for realism
    print(f"Received DEMO generation request for project: {payload.project_id}, prompt: {payload.user_prompt}. Job ID: {job_id}")

    # Simulate some processing delay if desired
    # import asyncio
    # await asyncio.sleep(1) # Optional: to make it feel like it's working

    mock_tweets = [
        f"🚀 Big news from project {payload.project_id}! We've just pushed an update addressing: '{payload.user_prompt}'. Here's the scoop: 🧵👇",
        "1/ Our latest enhancements focus on improving the core user experience and adding nifty features based on your feedback!",
        "2/ We've revamped the UI for smoother navigation and squashed some pesky bugs. Performance also got a nice boost!",
        f"3/ Shoutout to the amazing dev team for their hard work on commit(s): {', '.join(payload.commits) if payload.commits else 'the latest series of updates'}! #BuildInPublic #{payload.project_id.replace('-', '').replace('_', '')} #DevLife",
        "4/ What are your thoughts on these changes? We're all ears! Drop your comments below. More exciting stuff coming soon. ✨"
    ]

    return DemoGenerateResponse(
        project_id=payload.project_id,
        user_prompt=payload.user_prompt,
        tweet_thread=mock_tweets,
        job_id=job_id
    )


@router.post("/", response_model=GenerateResponse)
async def start_generation_job(
    request: Request, 
    payload: GenerateRequest = Body(...),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """Kicks off a LangGraph agent to generate content.
    Streams node events over WebSocket/SSE via the /events/{job_id} endpoint.
    """
    job_id = str(uuid.uuid4())
    print(f"Received generation request. Assigning Job ID: {job_id}")

    # TODO: Validate payload, check user authentication/authorization if needed

    # Add the core processing to background tasks
    background_tasks.add_task(
        process_generation_request,
        job_id,
        payload.project_id,
        payload.commits,
        payload.user_prompt,
        request # Pass the whole request object to access app.state.supabase if needed
    )

    return GenerateResponse(
        job_id=job_id,
        message="Generation process started. Track progress via /events/{job_id}"
    )

# TODO: Add any helper functions for this route, e.g., for interacting with Supabase for this specific task. 