from pydantic import BaseModel, Field, EmailStr
from typing import Optional

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    user_type: str

class CustomerRequest(BaseModel):
    destination: str
    pickup_lat: Optional[float] = None
    pickup_lng: Optional[float] = None
    destination_lat: Optional[float] = None
    destination_lng: Optional[float] = None

class StatusUpdateRequest(BaseModel):
    is_available: bool

class PriceVoteRequest(BaseModel):
    driver_id: int
    vote: int  # 1 for increase, -1 for decrease