from fastapi import APIRouter, Depends, HTTPException, status
from utils.db_utils import get_db_connection,verify_jwt_token


router = APIRouter()

@router.get("/drivers")
async def get_all_drivers(user_data: dict = Depends(verify_jwt_token)):
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

@router.get("/customers")
async def get_all_customers(user_data: dict = Depends(verify_jwt_token)):
    if user_data['user_type'] != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized"
        )
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute("""
            SELECT r.customer_id, u.name, u.email, 
            (SELECT COUNT(*) FROM rides WHERE customer_id = r.customer_id) as trip_count
            FROM customer r
            JOIN users u ON r.customer_id = u.user_id
        """)
        customers = cursor.fetchall()
        
        return customers
    finally:
        cursor.close()
        conn.close()

@router.get("/trips")
async def get_all_trips(user_data: dict = Depends(verify_jwt_token)):
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
                ur.name as customer_name, 
                ud.name as driver_name,
                r.status,
                r.created_at as date
            FROM rides r
            JOIN users ur ON r.customer_id = ur.user_id
            JOIN users ud ON r.driver_id = ud.user_id
            ORDER BY r.created_at DESC
            LIMIT 50
        """)
        trips = cursor.fetchall()
        
        return trips
    finally:
        cursor.close()
        conn.close()