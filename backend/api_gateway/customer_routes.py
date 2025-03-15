from fastapi import APIRouter, Depends, HTTPException, status
from models import CustomerRequest
from utils.db_utils import get_customer_location, update_customer_location, generate_random_bengaluru_location, get_nearest_driver, book_ride_with_coords, verify_jwt_token

router = APIRouter()

@router.get("/{customer_id}/location")
async def get_customer_location_api(customer_id: int, user_data: dict = Depends(verify_jwt_token)):
    if user_data['user_id'] != customer_id and user_data['user_type'] != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized"
        )
    
    location = get_customer_location(customer_id)
    if location:
        return location
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found"
        )

@router.post("/{customer_id}/refresh-location")
async def refresh_customer_location(customer_id: int, user_data: dict = Depends(verify_jwt_token)):
    if user_data['user_id'] != customer_id and user_data['user_type'] != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized"
        )
    
    new_location = generate_random_bengaluru_location()
    result = update_customer_location(
        customer_id, 
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

@router.post("/{customer_id}/request-ride")
async def request_ride(customer_id: int, request: CustomerRequest, user_data: dict = Depends(verify_jwt_token)):
    if user_data['user_id'] != customer_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized"
        )
    
    drivers = get_nearest_driver(customer_id)
    if not drivers:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No drivers available"
        )
    
    driver_id = drivers[0]['driver_id']
    
    ride_id = book_ride_with_coords(
        customer_id, 
        driver_id, 
        request.destination,
        request.pickup_lat,
        request.pickup_lng,
        request.destination_lat,
        request.destination_lng
    )
    
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