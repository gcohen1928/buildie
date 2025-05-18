from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query
import asyncio # For mocking delay
import uuid # For generating mock IDs
import os # Added os for env vars
from typing import List # Added List

# from app.dependencies import get_current_user # Assuming you have user auth
from app.schemas.project import ProjectCreate, ProjectRead, CommitRead, CommitListResponse # Added CommitListResponse
from app.ingest.indexer import RepoIndexer # Added RepoIndexer
from app.ingest.commit_historian import CommitHistorian # Import new class
from supabase import create_client, Client # Keep this for create_client and Client
from postgrest.exceptions import APIError # Correct import for APIError

router = APIRouter()

# Placeholder for actual Supabase client initialization (ideally via DI)
# For now, direct initialization as an example if not using DI for routes
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("WARNING: SUPABASE_URL or SUPABASE_KEY environment variables not set. API endpoints needing DB access might fail.")
    # In a real app, you might raise an error or have a clearer config strategy
    supabase_client: Client = None # type: ignore
else:
    supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

@router.post("/", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate,
    background_tasks: BackgroundTasks,
    # current_user: dict = Depends(get_current_user) # Protect this route
):
    """
    Create a new project, trigger background indexing, and commit history ingestion.
    - **name**: Name of the project.
    - **github_url**: URL of the GitHub repository.
    - **description**: Optional description for the project.
    """
    print(f"Received project creation request: {project_data.name}")
    print(f"GitHub URL: {project_data.html_url}")

    # Initialize RepoIndexer
    # Ensure OPENAI_API_KEY, SUPABASE_URL, SUPABASE_KEY are set in your environment
    try:
        indexer = RepoIndexer(
            openai_api_key=os.getenv("OPENAI_API_KEY"),
            supabase_url=SUPABASE_URL, # Use defined client vars
            supabase_key=SUPABASE_KEY
        )
        # Instantiate CommitHistorian
        commit_historian = CommitHistorian(
            supabase_url=SUPABASE_URL,
            supabase_key=SUPABASE_KEY
        )
    except ValueError as e:
        print(f"Error initializing services: {e}")
        raise HTTPException(status_code=500, detail=f"Server configuration error: {e}")

    # The RepoIndexer's _create_project_entry will create the project in the DB
    # and return its ID. We need to call this first to get the project_id.
    # The index_repo method itself also calls _create_project_entry.
    # We will let index_repo handle the project creation and return the ID.

    # For the API response, we need the project ID immediately.
    # _create_project_entry is designed to return the project_id.
    # However, index_repo does more.
    # A potential flow:
    # 1. Call a modified _create_project_entry (or a new method) that ONLY creates DB record and returns ID.
    # 2. Then, run the rest of indexing (cloning, chunking, embedding) in background.

    # For simplicity now, let's assume _create_project_entry can be called,
    # and then we trigger index_repo which might re-confirm or skip project creation if exists.
    # Or, index_repo itself needs to return the project_id after creating it.

    # Looking at indexer.py, index_repo calls _create_project_entry and sets self.current_project_id.
    # We need this ID for the response.
    # The challenge is index_repo is a longer process.

    # Let's adapt: RepoIndexer needs a way to give us the project_id synchronously
    # before kicking off the long background task.
    # Option 1: _create_project_entry is called first, then index_repo_background(project_id, repo_url)
    # Option 2: index_repo creates project, returns ID, then schedules its own internal background tasks. (Complex for index_repo)

    # Going with Option 1 variant:
    try:
        print(f"Attempting to create project entry for: {project_data.html_url}")
        # This will create the project in the 'projects' table and return its ID
        # or find the existing one and clear its embeddings.
        project_id = indexer._create_project_entry(repo_url=project_data.html_url)
        print(f"Project entry created/retrieved with ID: {project_id}")
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error during project entry creation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create project entry: {str(e)}")

    # Now that we have project_id, schedule background tasks
    # The index_repo function already contains the logic to clone, chunk, embed.
    # We need to ensure it uses the `project_id` we just obtained or that
    # its internal `_create_project_entry` call is idempotent or handles existing projects.
    # `indexer.index_repo` sets `self.current_project_id` from `_create_project_entry`.
    # So, calling `indexer.index_repo` directly in the background should be fine.
    
    background_tasks.add_task(indexer.index_repo, repo_url=project_data.html_url)
    # Use CommitHistorian for ingesting commit history
    background_tasks.add_task(commit_historian.ingest_commit_history, project_id=project_id, repo_url=project_data.html_url)

    # Construct the response object.
    # The `ProjectRead` schema expects `id`, `name`, `github_url`, `description`.
    # `_create_project_entry` uses `project_data.name` if the project is new,
    # or fetches existing. For a new project, `project_data.name` is correct.
    # If project already existed, `_create_project_entry` doesn't return the original name used in API call
    # This needs to be handled gracefully. For now, assume new project name is used.
    created_project = ProjectRead(
        id=project_id, # This is the UUID from Supabase
        name=project_data.name, # Use the name from the request
        html_url=project_data.html_url, # Corrected to html_url, was github_url
        description=project_data.description,
        # user_id=current_user["id"] # Or however you store user ID
    )

    print(f"Project {created_project.name} (ID: {created_project.id}) creation endpoint finished. Background tasks scheduled.")
    return created_project

@router.get("/", response_model=List[ProjectRead])
async def list_projects(
    # current_user: dict = Depends(get_current_user) # Optional: for user-specific projects
):
    """
    Retrieve all projects, ordered by last updated.
    """
    if not supabase_client:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database service is not configured or available.")

    try:
        response = await asyncio.to_thread(
            supabase_client.table("projects")
            .select("id, name, html_url, description, created_at, updated_at")
            .order("updated_at", desc=True) # Order by most recently updated
            .execute
        )

        if response.data:
            return response.data
        else:
            # If response.data is empty, it means no projects, return an empty list.
            # Errors during execution would be caught by the except block.
            return [] 

    except APIError as e:
        print(f"Supabase APIError listing projects: {e.code} - {e.message} - {e.details} - {e.hint}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database error listing projects: {e.message}")
    except Exception as e:
        print(f"An unexpected error occurred while listing projects: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"An unexpected error occurred: {str(e)}")

@router.get("/{project_identifier}", response_model=ProjectRead)
async def get_project( # Changed function name for clarity, though route path is same
    project_identifier: str, # Changed type to str to accept UUID or slug
    # current_user: dict = Depends(get_current_user) # Ensure user owns project or has access
):
    """
    Get a specific project by its UUID or by its path string (e.g., "org/repo").
    - **project_identifier**: The UUID or "org_name/repo_name" string of the project.
    """
    if not supabase_client:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database service is not configured or available.")

    print(f"Fetching project with identifier: {project_identifier}")
    
    data_to_return = None
    
    try:
        # Attempt to treat as UUID first
        parsed_uuid = None
        try:
            parsed_uuid = uuid.UUID(project_identifier)
        except ValueError:
            pass # Not a valid UUID, will try string lookup

        if parsed_uuid:
            print(f"Identifier '{project_identifier}' is a valid UUID. Querying by ID.")
            response = await asyncio.to_thread(
                supabase_client.table("projects")
                .select("id, name, html_url, description")
                .eq("id", str(parsed_uuid))
                .single()
                .execute
            )
            data_to_return = response.data
        else:
            # Not a valid UUID, treat as a potential path (e.g., "org/repo")
            print(f"Identifier '{project_identifier}' is not a UUID. Assuming it is 'org/repo' and querying by html_url.")
            expected_html_url = f"https://github.com/{project_identifier}"
            print(f"Constructed expected_html_url for query: '{expected_html_url}'")
            
            response = await asyncio.to_thread(
                supabase_client.table("projects")
                .select("id, name, html_url, description")
                .eq("html_url", expected_html_url) # Query by the constructed html_url
                .single() # Expect a single record
                .execute
            )
            data_to_return = response.data

        if data_to_return:
            return data_to_return
        else:
            # This path should ideally be hit if .single() itself doesn't error out but returns no data
            print(f"Project with identifier {project_identifier} not found after query attempts.")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Project with identifier {project_identifier} not found.")

    except APIError as e:
        # PGRST116: "JSON object requested, multiple (or no) rows returned" - from .single()
        print(f"Supabase APIError fetching project {project_identifier}: {e.code} - {e.message}")
        if e.code == 'PGRST116' or (hasattr(e, 'details') and isinstance(e.details, str) and "0 rows" in e.details): # Check for "0 rows" as Supabase might change exact error
             raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Project with identifier {project_identifier} not found.")
        else:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database error fetching project: {e.message}")
    except Exception as e:
        print(f"An unexpected error occurred while fetching project {project_identifier}: {e}")
        # import traceback
        # traceback.print_exc() # For server-side debugging
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"An unexpected error occurred: {str(e)}")

@router.get("/{project_id}/commits", response_model=CommitListResponse)
async def get_project_commits(
    project_id: uuid.UUID, # This still expects a UUID. Frontend needs to use the UUID after fetching project by slug.
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    # current_user: dict = Depends(get_current_user) # Optional: for auth
):
    """
    Retrieve commits for a given project with pagination, ordered by commit_timestamp descending.
    """
    if not supabase_client:
        raise HTTPException(status_code=503, detail="Database service is not configured or available.")

    print(f"Fetching commits for project ID: {project_id}, skip: {skip}, limit: {limit}")
    try:
        # Fetch commits with pagination
        commits_response = await asyncio.to_thread(
            supabase_client.table("commits")
            .select("id, commit_sha, message, author_name, commit_timestamp") # Select specific columns
            .eq("project_id", str(project_id))
            .order("commit_timestamp", desc=True)
            .range(skip, skip + limit - 1) # Supabase uses range for pagination: range(from, to) inclusive
            .execute
        )

        # Fetch total count of commits
        count_response = await asyncio.to_thread(
            supabase_client.table("commits")
            .select("id", count='exact') # count='exact' is the Supabase way to get total count
            .eq("project_id", str(project_id))
            .execute
        )

        commits_data = commits_response.data if commits_response.data else []
        total_commits = count_response.count if count_response.count is not None else 0
        
        # If commits_response.data is empty, it simply means no records found for the current page.
        # If count_response.count is 0, it means no records found for the project.
        # Actual errors during execute() would be raised as exceptions and caught below.

        return CommitListResponse(commits=commits_data, total_commits=total_commits)

    except Exception as e:
        print(f"An error occurred while fetching commits for project {project_id}: {e}")
        # import traceback # Consider for more detailed server-side logging
        # traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"An error occurred while fetching commit data: {str(e)}")

# And a route to get a specific project
# @router.get("/{project_id}", response_model=ProjectRead)
# async def get_project(
#     project_id: uuid.UUID,
#     # current_user: dict = Depends(get_current_user) # Ensure user owns project
# ):
#     # Fetch project by ID, ensuring it belongs to current_user
#     # return project
#     pass 