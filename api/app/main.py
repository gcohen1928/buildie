from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from pydantic import BaseModel, Field
from typing import List, Optional

# TODO: Import routers
from .routes import auth, webhook, projects, twitter_routes #, generate, events # Uncommented webhook
# TODO: Import Phoenix for Arize logging if global setup is needed
# import phoenix as px

load_dotenv()

app = FastAPI(
    title="Build-in-Public Autopilot API",
    description="API for ingesting GitHub webhooks, running LangGraph agents, and streaming results.",
    version="0.1.0"
)

# CORS Middleware Configuration
origins = [
    "http://localhost:3000",  # Allow your Next.js frontend
    # You can add other origins here if needed, e.g., your deployed frontend URL
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True, # Allows cookies to be included in requests
    allow_methods=["*"],    # Allows all methods (GET, POST, PUT, etc.)
    allow_headers=["*"],    # Allows all headers
)

# TODO: Initialize Arize Phoenix if needed globally
# if os.getenv("ARIZE_ORG_KEY"):
#     px.launch_app()
#     print("Phoenix Arize UI running if API key is valid.")

# Mount routers
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(webhook.router, prefix="/webhook", tags=["webhook"]) # Uncommented this line
app.include_router(projects.router, prefix="/projects", tags=["projects"])
app.include_router(twitter_routes.router, tags=["Twitter"])
# TODO: app.include_router(generate.router, prefix="/generate", tags=["generate"])
# TODO: app.include_router(events.router, prefix="/events", tags=["events"])

# Pydantic models for the mock demo endpoint
class DemoGenerationRequest(BaseModel):
    project_id: str
    commits: Optional[List[str]] = None
    user_prompt: str

class DemoGenerationResponse(BaseModel):
    tweet_thread: List[str] = Field(..., example=["Mock tweet 1!", "Mock tweet 2!"])
    # Add any other fields your frontend might expect

@app.post("/api/generate/demo", response_model=DemoGenerationResponse, tags=["Demo"])
async def generate_demo_endpoint(request_body: DemoGenerationRequest):
    print(f"Received demo generation request for project: {request_body.project_id}")
    print(f"User prompt: {request_body.user_prompt}")
    
    # Simulate some work if you like
    # import asyncio
    # await asyncio.sleep(1)

    # Return a successful mock response
    return DemoGenerationResponse(
        tweet_thread=[
            f"This is a mock tweet for your prompt: '{request_body.user_prompt[:50]}...'",
            "Buildie is working on it (mockly)!",
            "#buildinpublic #demoresults 🎉"
        ]
    )

@app.on_event("startup")
async def startup_event():
    # TODO: Initialize Supabase client
    # supabase_url = os.getenv("SUPABASE_URL")
    # supabase_key = os.getenv("SUPABASE_KEY")
    # if not supabase_url or not supabase_key:
    #     print("Warning: Supabase credentials not found. Some features might not work.")
    # else:
    #     # app.state.supabase = create_client(supabase_url, supabase_key)
    #     print("Supabase client initialized (placeholder).")
    print("FastAPI application startup complete.")

@app.on_event("shutdown")
async def shutdown_event():
    # TODO: Cleanup resources if any
    # if hasattr(app.state, 'supabase') and app.state.supabase:
    #     # await app.state.supabase.auth.sign_out() # Example cleanup
    #     print("Supabase client shutdown (placeholder).")
    print("FastAPI application shutdown.")

@app.get("/health", tags=["Health"])
async def health_check():
    """Endpoint to check the health of the API."""
    return {"status": "ok", "message": "API is running"}

# Placeholder for root path, can be removed or expanded
@app.get("/", response_class=HTMLResponse, include_in_schema=False)
async def root():
    return """<html>
        <head><title>Autopilot API</title></head>
        <body><h1>Build-in-Public Autopilot API</h1><p>See <a href='/docs'>/docs</a> for API documentation.</p></body>
    </html>"""

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("API_PORT", 8000)), reload=True) 