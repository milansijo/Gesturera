from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# --- Auth Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

class UserCreate(BaseModel):
    email: EmailStr
    password: str

# --- DB Response Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    role: str

class UserResponse(UserBase):
    id: int
    created_at: datetime
    
    class Config:
        orm_mode = True
        from_attributes = True

class PredictionBase(BaseModel):
    predicted_sign: str
    confidence: Optional[float] = None

class PredictionCreate(PredictionBase):
    pass

class PredictionResponse(PredictionBase):
    id: int
    user_id: int
    timestamp: datetime

    class Config:
        orm_mode = True
        from_attributes = True

# --- API Payloads ---
class PredictPayload(BaseModel):
    landmarks: List[float] # Expected to be 63 floats
