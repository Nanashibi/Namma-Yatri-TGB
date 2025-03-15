from fastapi import APIRouter, Depends, HTTPException, status
from models import StatusUpdateRequest
from utils.db_utils import get_driver_location, update_driver_location, generate_random_bengaluru_location, get_db_connection, verify_jwt_token

router = APIRouter()

@router.get("/{driver_id}/location")
async def get_driver_location_api(driver_id: int, user_data: dict = Depends(verify_jwt_token)):
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

@router.post("/{driver_id}/refresh-location")
async def refresh_driver_location(driver_id: int, user_data: dict = Depends(verify_jwt_token)):
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

@router.get("/{driver_id}/status")
async def get_driver_status(driver_id: int, user_data: dict = Depends(verify_jwt_token)):
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

@router.post("/{driver_id}/update-status")
async def update_driver_status(driver_id: int, request: StatusUpdateRequest, user_data: dict = Depends(verify_jwt_token)):
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