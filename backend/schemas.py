from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    username: str
    email: str
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class BuildCreate(BaseModel):
    name: str
    device_type: str

class BuildUpdate(BaseModel):
    parts_installed: Optional[List[str]] = None
    user_code: Optional[str] = None

class BuildUpdate(BaseModel):
    name: Optional[str] = None
    parts_installed: Optional[List[str]] = None
    user_code: Optional[str] = None
    
class BuildOut(BaseModel):
    id: int
    name: str
    device_type: str
    parts_installed: List
    user_code: str
    created_at: datetime

    class Config:
        from_attributes = True