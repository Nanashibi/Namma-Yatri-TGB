import mysql.connector
import os

# Load database credentials from environment variables
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "namma_yatri_db")
}

def get_db_connection():
    return mysql.connector.connect(**DB_CONFIG)

def get_available_drivers():
    """Fetch available drivers sorted by proximity."""
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
    """Update driver's location in the database."""
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
