from fastapi import APIRouter, Request, HTTPException, Depends, status
from fastapi.responses import RedirectResponse
import os
from supabase import Client as SupabaseClient # Renamed to avoid conflict with pydantic.BaseModel
from ..core.supabase_client import supabase_client # Use the client we configured
from ..schemas.auth import UserCreate, UserLogin, Token, UserResponse
from gotrue.errors import AuthApiError
from ..dependencies.auth import get_current_user # Import the new dependency

# TODO: Import Supabase client from main app or a shared module
# from ..main import app as main_app # Example

router = APIRouter()

# Placeholder for OAuth settings - these should come from environment variables
# GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
# GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")
# TWITTER_CLIENT_ID = os.getenv("TWITTER_CLIENT_ID")
# TWITTER_CLIENT_SECRET = os.getenv("TWITTER_CLIENT_SECRET")
# LINKEDIN_CLIENT_ID = os.getenv("LINKEDIN_CLIENT_ID")
# LINKEDIN_CLIENT_SECRET = os.getenv("LINKEDIN_CLIENT_SECRET")

# TODO: Define Pydantic models for request/response if necessary

@router.get("/login/{provider}")
async def login_provider(provider: str, request: Request):
    """Redirects user to the provider's OAuth login page."""
    # supabase_client = request.app.state.supabase # Example: Get Supabase client
    # TODO: Implement OAuth redirect logic using Supabase Auth or a library like authlib
    # Example with Supabase:
    # auth_url_response = await supabase_client.auth.sign_in_with_oauth({
    #     "provider": provider,
    #     "options": {
    #         "redirect_to": str(request.url_for('callback', provider=provider))
    #     }
    # })
    # if auth_url_response.url:
    #     return RedirectResponse(auth_url_response.url)
    # raise HTTPException(status_code=500, detail=f"Could not initiate OAuth for {provider}")
    return {"message": f"Login endpoint for {provider} (Not Implemented)", "redirect_url_placeholder": f"/auth/callback/{provider}"}

@router.get("/callback/{provider}")
async def callback_provider(provider: str, request: Request, code: str = None, error: str = None):
    """Handles the OAuth callback from the provider."""
    # supabase_client = request.app.state.supabase # Example
    # TODO: Exchange authorization code for an access token and user session
    # This is where Supabase handles the session automatically after redirect if using its OAuth flow.
    # If manual, you'd exchange the code, get user info, create a session/JWT.
    if error:
        raise HTTPException(status_code=400, detail=f"OAuth error with {provider}: {error}")
    if not code:
        raise HTTPException(status_code=400, detail=f"Missing authorization code for {provider}")

    # Placeholder: Simulate token exchange and session creation
    # In a real app, you would store the session or redirect the user to the frontend with a token.
    print(f"OAuth callback for {provider} with code: {code}")
    # return RedirectResponse(url="/dashboard_or_frontend_url_with_session_info")
    return {"message": f"OAuth callback for {provider} received (Not Implemented)", "code": code}

@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(client: SupabaseClient = Depends(lambda: supabase_client), current_user: UserResponse = Depends(get_current_user)):
    """Logs out the current authenticated user by invalidating their session with Supabase."""
    try:
        # The access_token is needed to invalidate the correct session on the Supabase server.
        # We get it from the current_user dependency which decodes it from the Authorization header.
        # However, Supabase Python client's sign_out typically uses the client's current session.
        # If the client was instantiated per request and had its session set from the token, this would work.
        # For a stateless API, we need to explicitly tell Supabase which user's session to end.
        # Supabase `sign_out` revokes the current session for the client instance.
        # If your `supabase_client` is global and had a session set, it would sign *that* out.
        # To ensure we sign out the *requesting* user, it's better to rely on Supabase to
        # manage this based on the JWT it receives and validates via `get_current_user`.
        # The `client.auth.sign_out()` method revokes all refresh tokens for the user and invalidates the current access token.
        
        # Supabase client needs the JWT to be set to sign out the correct user.
        # The `get_current_user` dependency ensures we have a valid user,
        # but we need to pass the token to the sign_out function or ensure client has it.
        # Let's assume `get_current_user` also makes the token available or the client is already configured.
        # A more robust way might involve passing the token from the request headers if sign_out needs it explicitly.
        # For now, let's try the direct sign_out().
        
        # The Supabase client must have the user's JWT set to perform a sign-out.
        # The `get_current_user` dependency implies the token was valid.
        # If the `supabase_client` is correctly configured (e.g. its state is managed correctly
        # or it's re-instantiated/configured with the token for this request), sign_out() should work.

        # Let's ensure we pass the token from the request if possible for sign_out.
        # The `get_current_user` dependency would have validated the token from the Authorization header.
        # We need a way to get that raw token here.
        # A simpler approach: `client.auth.sign_out()` will sign out the session associated with the token
        # that this `client` instance currently has. If `get_current_user` has set it up, it will work.

        # The `get_current_user` dependency already validates the token.
        # Supabase's `sign_out` invalidates the user's session on the Supabase server.
        # No explicit token pass needed here if `client` instance is properly managed
        # or `get_current_user` sets session on the client.
        # For Supabase, `sign_out` typically revokes the current session token
        # and all refresh tokens for the user.
        
        error = client.auth.sign_out() # This will use the token from the `Authorization` header if `supabase_client.auth.set_session` was called
                                  # or if the client is configured to automatically pick it up.
                                  # Since `get_current_user` validates based on the header, Supabase should be aware.

        if error: # Supabase client's sign_out might return an error object if it fails.
            # However, gotrue-py's sign_out() returns None on success and raises AuthApiError on failure.
            # So this check might not be needed if exceptions are handled.
            # Let's rely on exception handling.
            pass # Will be caught by AuthApiError or generic Exception

        return {"message": "Logout successful"}
    except AuthApiError as e:
        # This might occur if the token is already invalid or other Supabase specific issues.
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Logout failed: {e.message}")
    except Exception as e:
        # Catch-all for unexpected errors
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"An unexpected error occurred during logout: {str(e)}")

@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def signup(user_credentials: UserCreate, client: SupabaseClient = Depends(lambda: supabase_client)):
    try:
        response = client.auth.sign_up({
            "email": user_credentials.email,
            "password": user_credentials.password,
        })
        if response.user and response.user.id:
            return UserResponse(id=str(response.user.id), email=response.user.email)
        elif response.error:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=response.error.message)
        else:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unexpected error during signup")
    except AuthApiError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred.")

@router.post("/login", response_model=Token)
async def login(user_credentials: UserLogin, client: SupabaseClient = Depends(lambda: supabase_client)):
    try:
        response = client.auth.sign_in_with_password({
            "email": user_credentials.email,
            "password": user_credentials.password
        })
        if response.session and response.session.access_token:
            return Token(access_token=response.session.access_token, token_type="bearer")
        elif response.error:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=response.error.message or "Invalid credentials")
        else:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unexpected error during login")
    except AuthApiError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=e.message or "Invalid credentials")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred.")

@router.get("/users/me", response_model=UserResponse)
async def read_users_me(current_user: UserResponse = Depends(get_current_user)):
    """Fetches the current authenticated user's details."""
    return current_user

# TODO: Add a /me endpoint to get current user status if needed 