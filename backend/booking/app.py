from fastapi import APIRouter, HTTPException
from db import get_db_connection, update_driver_location
from utils import get_fare, find_nearest_driver
from models import RideRequest, RideResponse

router = APIRouter()

@router.post("/request", response_model=RideResponse)
def request_booking(ride: RideRequest):
    """Handles a new ride request and assigns a driver."""
    fare = get_fare(ride.pickup_lat, ride.pickup_lon, ride.dropoff_lat, ride.dropoff_lon)
    if fare is None:
        raise HTTPException(status_code=500, detail="Failed to calculate fare")

    driver_id = find_nearest_driver(ride.pickup_lat, ride.pickup_lon)
    if driver_id is None:
        raise HTTPException(status_code=404, detail="No drivers available")

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO rides (rider_id, driver_id, pickup_location, dropoff_location, 
                           pickup_lat, pickup_lon, dropoff_lat, dropoff_lon, fare, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'pending')
    """, (ride.rider_id, driver_id, ride.pickup_location, ride.dropoff_location, 
          ride.pickup_lat, ride.pickup_lon, ride.dropoff_lat, ride.dropoff_lon, fare))

    ride_id = cursor.lastrowid
    conn.commit()
    
    cursor.close()
    conn.close()

    return RideResponse(ride_id=ride_id, driver_id=driver_id, fare=fare, status="pending")
