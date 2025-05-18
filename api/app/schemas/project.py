from pydantic import BaseModel, HttpUrl
from typing import Optional, List
import uuid
from datetime import datetime

class ProjectBase(BaseModel):
    name: str
    html_url: HttpUrl
    description: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectRead(ProjectBase):
    id: uuid.UUID
    # user_id: uuid.UUID # Assuming you'll link projects to users
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    html_url: Optional[HttpUrl] = None
    description: Optional[str] = None

# New schema for commit data returned by the API
class CommitRead(BaseModel):
    id: uuid.UUID # The DB id of the commit record
    commit_sha: str
    message: Optional[str] = None
    author_name: Optional[str] = None
    # author_avatar_url: Optional[str] = None # Need a way to get this, maybe later
    commit_timestamp: datetime # Will be formatted as string by FastAPI automatically
    # For frontend mapping:
    # 'author' on frontend could be author_name
    # 'date' on frontend is commit_timestamp
    # 'sha' on frontend is commit_sha
    # 'verified' not directly in DB, can be defaulted or logic added if needed

    class Config:
        from_attributes = True # Replaces orm_mode in Pydantic v2

class CommitListResponse(BaseModel):
    commits: List[CommitRead]
    total_commits: int 