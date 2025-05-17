from pydantic import BaseModel, EmailStr, Field

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    # You can add other fields like first_name, last_name if needed
    # and pass them as user_metadata to Supabase
    # full_name: str | None = None 

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    # Supabase also returns refresh_token, expires_in, user object
    # You can expand this model as needed

class UserResponse(BaseModel):
    id: str # UUID from Supabase
    email: EmailStr
    # Add other fields you want to return about the user 