from fastapi import FastAPI, Depends, HTTPException, Header, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, Dict, List, Union, Any
import uvicorn
import os
from utils.db_utils import (
    authenticate_user, register_user, verify_jwt_token,
    get_rider_location, update_rider_location, generate_random_bengaluru_location,
    get_driver_location, update_driver_location, get_nearest_driver, book_ride,
    get_db_connection
)

app = FastAPI(
    title="Namma Yatri API",
    description="API for the Namma Yatri ride booking platform",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins in development
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Pydantic models for request validation
class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    user_type: str

class RideRequest(BaseModel):
    destination: str

class StatusUpdateRequest(BaseModel):
    is_available: bool

# Dependency for token verification
async def verify_token(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = authorization.replace("Bearer ", "")
    user_data = verify_jwt_token(token)
    
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    return user_data

# Auth routes
@app.post("/api/auth/login", status_code=status.HTTP_200_OK)
async def login(request: LoginRequest):
    try:
        result = authenticate_user(request.email, request.password)
        
        if result['success']:
            return {
                'token': result['token'],
                'user': result['user']
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=result['message']
            )
    except Exception as e:
        print(f"Login endpoint error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {str(e)}"
        )

@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest):
    try:
        result = register_user(request.name, request.email, request.password, request.user_type)
        
        if result['success']:
            return {'message': result['message'], 'user_id': result['user_id']}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result['message']
            )
    except HTTPException:
        # Pass through HTTP exceptions we've already raised
        raise
    except Exception as e:
        print(f"Registration endpoint error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {str(e)}"
        )

@app.get("/api/auth/verify-session")
async def verify_session(user_data: dict = Depends(verify_token)):
    return {'user': user_data}

# Rider routes
@app.get("/api/riders/{rider_id}/location")
async def get_rider_location_api(rider_id: int, user_data: dict = Depends(verify_token)):
    # Verify the user is requesting their own data
    if user_data['user_id'] != rider_id and user_data['user_type'] != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized"
        )
    
    location = get_rider_location(rider_id)
    if location:
        return location
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found"
        )

@app.post("/api/riders/{rider_id}/refresh-location")
async def refresh_rider_location(rider_id: int, user_data: dict = Depends(verify_token)):
    # Verify the user is updating their own data
    if user_data['user_id'] != rider_id and user_data['user_type'] != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized"
        )
    
    new_location = generate_random_bengaluru_location()
    result = update_rider_location(
        rider_id, 
        new_location["location_name"], 
        new_location["latitude"], 
        new_location["longitude"]
    )
    
    if result:
        return new_location
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update location"
        )

@app.post("/api/riders/{rider_id}/request-ride")
async def request_ride(rider_id: int, request: RideRequest, user_data: dict = Depends(verify_token)):
    # Verify the user is requesting their own ride
    if user_data['user_id'] != rider_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized"
        )
    
    # Find nearest driver
    drivers = get_nearest_driver(rider_id)
    if not drivers:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No drivers available"
        )
    
    # Book with the first available driver
    driver_id = drivers[0]['driver_id']
    ride_id = book_ride(rider_id, driver_id)
    
    if ride_id:
        return {
            'ride_id': ride_id,
            'driver_id': driver_id,
            'status': 'pending',
            'destination': request.destination
        }
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to book ride"
        )

# Driver routes
@app.get("/api/drivers/{driver_id}/location")
async def get_driver_location_api(driver_id: int, user_data: dict = Depends(verify_token)):
    # Verify the user is requesting their own data or is an admin
    if user_data['user_id'] != driver_id and user_data['user_type'] != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized"
        )
    
    location = get_driver_location(driver_id)
    if location:
        return location
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found"
        )

@app.post("/api/drivers/{driver_id}/refresh-location")
async def refresh_driver_location(driver_id: int, user_data: dict = Depends(verify_token)):
    # Verify the user is updating their own data
    if user_data['user_id'] != driver_id and user_data['user_type'] != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized"
        )
    
    new_location = generate_random_bengaluru_location()
    result = update_driver_location(
        driver_id, 
        new_location["location_name"], 
        new_location["latitude"], 
        new_location["longitude"]
    )
    
    if result:
        return new_location
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update location"
        )

@app.get("/api/drivers/{driver_id}/status")
async def get_driver_status(driver_id: int, user_data: dict = Depends(verify_token)):
    # Verify the user is requesting their own data or is an admin
    if user_data['user_id'] != driver_id and user_data['user_type'] != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized"
        )
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute("SELECT is_available FROM driver WHERE driver_id = %s", (driver_id,))
        status = cursor.fetchone()
        
        if status:
            return status
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Driver not found"
            )
    finally:
        cursor.close()
        conn.close()

@app.post("/api/drivers/{driver_id}/update-status")
async def update_driver_status(driver_id: int, request: StatusUpdateRequest, user_data: dict = Depends(verify_token)):
    # Verify the user is updating their own data
    if user_data['user_id'] != driver_id and user_data['user_type'] != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized"
        )
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            "UPDATE driver SET is_available = %s WHERE driver_id = %s",
            (request.is_available, driver_id)
        )
        conn.commit()
        
        return {'message': 'Status updated successfully'}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update status: {str(e)}"
        )
    finally:
        cursor.close()
        conn.close()

# Admin routes
@app.get("/api/admin/drivers")
async def get_all_drivers(user_data: dict = Depends(verify_token)):
    # Verify the user is an admin
    if user_data['user_type'] != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized"
        )
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute("""
            SELECT d.driver_id, u.name, u.email, d.is_available, d.location 
            FROM driver d
            JOIN users u ON d.driver_id = u.user_id
        """)
        drivers = cursor.fetchall()
        
        return drivers
    finally:
        cursor.close()
        conn.close()

@app.get("/api/admin/riders")
async def get_all_riders(user_data: dict = Depends(verify_token)):
    # Verify the user is an admin
    if user_data['user_type'] != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized"
        )
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute("""
            SELECT r.rider_id, u.name, u.email, 
            (SELECT COUNT(*) FROM rides WHERE rider_id = r.rider_id) as trip_count
            FROM rider r
            JOIN users u ON r.rider_id = u.user_id
        """)
        riders = cursor.fetchall()
        
        return riders
    finally:
        cursor.close()
        conn.close()

@app.get("/api/admin/trips")
async def get_all_trips(user_data: dict = Depends(verify_token)):
    # Verify the user is an admin
    if user_data['user_type'] != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized"
        )
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute("""
            SELECT 
                r.ride_id as trip_id, 
                ur.name as rider_name, 
                ud.name as driver_name,
                r.status,
                r.created_at as date
            FROM rides r
            JOIN users ur ON r.rider_id = ur.user_id
            JOIN users ud ON r.driver_id = ud.user_id
            ORDER BY r.created_at DESC
            LIMIT 50
        """)
        trips = cursor.fetchall()
        
        return trips
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    # Get port from environment variable or use default
    port = int(os.environ.get('PORT', 5000))
    uvicorn.run("api_server:app", host="0.0.0.0", port=port, reload=True)
