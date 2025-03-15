import mysql.connector
import os

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "namma_yatri_db")
}

def get_db_connection():
    return mysql.connector.connect(**DB_CONFIG)

def get_available_drivers():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute("""
        SELECT driver_id, latitude, longitude
        FROM driver
        WHERE is_available = TRUE
    """)
    drivers = cursor.fetchall()
    
    cursor.close()
    conn.close()
    return drivers

def update_driver_location(driver_id: int, lat: float, lon: float):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        UPDATE driver 
        SET latitude = %s, longitude = %s 
        WHERE driver_id = %s
    """, (lat, lon, driver_id))

    conn.commit()
    cursor.close()
    conn.close()

def relocate_driver(driver_id: int, lat: float, lon: float):
    """Relocate driver from a low demand to the nearest high demand radius."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        UPDATE driver 
        SET latitude = %s, longitude = %s 
        WHERE driver_id = %s
    """, (lat, lon, driver_id))

    conn.commit()
    cursor.close()
    conn.close()