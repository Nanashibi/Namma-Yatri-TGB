from pydantic import BaseModel
from typing import List, Optional

class RouteRequest(BaseModel):
    start_lat: float
    start_lon: float
    end_lat: float
    end_lon: float

class RouteResponse(BaseModel):
    route_id: int
    start_lat: float
    start_lon: float
    end_lat: float
    end_lon: float
    status: str

class Driver(BaseModel):
    driver_id: int
    latitude: float
    longitude: float
    is_available: bool
    rating: Optional[float]
    reviews: Optional[List[str]]
    created_at: Optional[str]
    updated_at: Optional[str]
    is_deleted: Optional[bool]
    deleted_at: Optional[str]

class Route(BaseModel):
    route_id: int
    start_lat: float
    start_lon: float
    end_lat: float
    end_lon: float
    status: str
    driver_id: Optional[int]
    waypoints: Optional[List[str]]
    eta: Optional[int]
    distance: Optional[float]
    fare: Optional[float]
    rating: Optional[float]
    reviews: Optional[List[str]]
    is_completed: Optional[bool]
    is_cancelled: Optional[bool]
    is_rated: Optional[bool]
    is_reviewed: Optional[bool]
    created_at: Optional[str]
    updated_at: Optional[str]
    completed_at: Optional[str]
    cancelled_at: Optional[str]
    rated_at: Optional[str]
    reviewed_at: Optional[str]
    driver: Optional[Driver]



class DriverLocation(BaseModel):
    driver_id: int
    latitude: float
    longitude: float
    created_at: Optional[str]
    updated_at: Optional[str]
    is_deleted: Optional[bool]
    deleted_at: Optional[str]