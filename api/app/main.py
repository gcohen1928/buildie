from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
import os

# TODO: Import routers
# from .routes import auth, webhook, generate, events
# TODO: Import Phoenix for Arize logging if global setup is needed
# import phoenix as px

load_dotenv()

app = FastAPI(
    title="Build-in-Public Autopilot API",
    description="API for ingesting GitHub webhooks, running LangGraph agents, and streaming results.",
    version="0.1.0"
)

# TODO: Initialize Arize Phoenix if needed globally
# if os.getenv("ARIZE_ORG_KEY"):
#     px.launch_app()
#     print("Phoenix Arize UI running if API key is valid.")

# Mount routers
# TODO: app.include_router(auth.router, prefix="/auth", tags=["auth"])
# TODO: app.include_router(webhook.router, prefix="/webhook", tags=["webhook"])
# TODO: app.include_router(generate.router, prefix="/generate", tags=["generate"])
# TODO: app.include_router(events.router, prefix="/events", tags=["events"])

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