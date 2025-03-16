from fastapi import APIRouter, HTTPException
from .queue_manager import QueueManager
from .timer_manager import TimerManager
from .penalty_manager import PenaltyManager
import mysql.connector
from datetime import datetime
from pydantic import BaseModel
import os

class PrebookRideRequest(BaseModel):
    customer_id: int
    ward: str
    pickup_time: str

router = APIRouter()
queue_manager = QueueManager()
timer_manager = TimerManager(queue_manager)  # Pass queue_manager to TimerManager
penalty_manager = PenaltyManager()

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "namma_yatri_db")
}
# Database connection
def get_db_connection():
    return mysql.connector.connect(
        host=DB_CONFIG["host"],
        user=DB_CONFIG["user"],
        password=DB_CONFIG["password"],
        database=DB_CONFIG["database"]
    )

@router.post("/prebook/")
async def prebook_ride(request: PrebookRideRequest):
    """Prebook a ride and add it to the queue"""
    # Add to database
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO prebooked_rides (customer_id, ward, pickup_time) VALUES (%s, %s, %s)",
            (request.customer_id, request.ward, request.pickup_time)
        )
        conn.commit()
        ride_id = cursor.lastrowid  
        if ride_id is None:
            ride_id = 1  
    except mysql.connector.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        cursor.close()
        conn.close()

    ride_details = {
        "ride_id": ride_id,
        "customer_id": request.customer_id,
        "ward": request.ward,
        "pickup_time": request.pickup_time
    }

    # Add to queue and start timer
    queue_manager.add_prebook_ride(request.ward, ride_details)
    timer_manager.start_acceptance_timer(request.ward, ride_details)
    return {"message": f"Ride {ride_id} prebooked successfully"}

@router.get("/prebooked_rides/{ward}")
async def get_prebooked_rides(ward: str):
    """Get all available prebooked rides for a ward"""
    rides = queue_manager.get_prebooked_rides(ward)
    return {"prebooked_rides": rides}

@router.post("/cancel_prebook/")
async def cancel_prebook(customer_id: int, ride_id: str):
    """Cancel a prebooked ride and add penalty to the customer"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Check if the ride exists and belongs to the customer
        cursor.execute(
            "SELECT * FROM prebooked_rides WHERE ride_id = %s AND customer_id = %s AND status = 'pending'",
            (ride_id, customer_id)
        )
        ride = cursor.fetchone()
        if not ride:
            raise HTTPException(status_code=404, detail="Ride not found or already accepted/cancelled")

        # Update ride status to 'cancelled'
        cursor.execute(
            "UPDATE prebooked_rides SET status = 'cancelled' WHERE ride_id = %s",
            (ride_id,)
        )
        conn.commit()

        # Add penalty to the customer
        penalty_manager.add_penalty(customer_id)
        return {"message": f"Ride {ride_id} cancelled. Penalty added to customer {customer_id}"}
    except mysql.connector.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        cursor.close()
        conn.close()