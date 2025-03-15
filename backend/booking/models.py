from pydantic import BaseModel
from typing import Optional

class RideRequest(BaseModel):
    rider_id: int
    pickup_location: str
    dropoff_location: str
    pickup_lat: float
    pickup_lon: float
    dropoff_lat: float
    dropoff_lon: float

class RideResponse(BaseModel):
    ride_id: int
    driver_id: Optional[int]
    fare: float
    status: str

class Driver(BaseModel):
    driver_id: int
    latitude: float
    longitude: float
    is_available: bool
