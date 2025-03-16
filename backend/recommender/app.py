from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import numpy as np
from ranking import rank_drivers

router = APIRouter()

class RideDetails(BaseModel):
    distance_km: float
    fare: float
    surge_multiplier: float
    duration_minutes: int
    hour: int
    is_weekend: int
    peak_hour: int
    origin_ward: str
    day_of_week: str

class DriverInfo(BaseModel):
    driver_id: str
    experience_months: int
    base_acceptance_rate: float
    peak_acceptance_rate: float
    avg_daily_hours: int
    primary_ward: str

class RecommendRequest(BaseModel):
    ride: RideDetails
    nearby_drivers: List[DriverInfo]

@router.post("/recommend")
def recommend_drivers(request: RecommendRequest):
    """Recommend drivers by ranking them based on likelihood of accepting the ride."""
    try:
        # Mock response with fixed probabilities as requested
        ranked_drivers = [
            {"driver_id": "DRV0002", "probability": np.float32(0.33847263)},
            {"driver_id": "DRV0001", "probability": np.float32(0.33712345)},
            {"driver_id": "DRV0003", "probability": np.float32(0.32440394)}
        ]
        
        # Convert numpy float32 to normal Python float for JSON serialization
        for driver in ranked_drivers:
            driver["probability"] = float(driver["probability"])
        
        return {"ranked_drivers": ranked_drivers}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error ranking drivers: {str(e)}")