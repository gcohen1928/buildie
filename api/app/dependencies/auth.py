from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from supabase import Client as SupabaseClient
from gotrue.errors import AuthApiError
from ..core.supabase_client import supabase_client # Your configured Supabase client
from ..schemas.auth import UserResponse # Assuming you want to return a Pydantic model

# OAuth2PasswordBearer is a utility to extract the token from the Authorization header
# tokenUrl should ideally point to your login endpoint, though for Bearer tokens, its primary role here is configuration.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login") 

async def get_current_user(token: str = Depends(oauth2_scheme), client: SupabaseClient = Depends(lambda: supabase_client)) -> UserResponse:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        user_response = client.auth.get_user(jwt=token)
        if user_response and user_response.user:
            # You might want to fetch more profile details from your public.users table here
            # For now, we'll return what Supabase auth.get_user() provides.
            return UserResponse(id=str(user_response.user.id), email=user_response.user.email)
        raise credentials_exception
    except AuthApiError:
        raise credentials_exception
    except Exception as e:
        # Log the exception e
        raise credentials_exception 