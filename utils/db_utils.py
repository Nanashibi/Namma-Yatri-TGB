import mysql.connector
from datetime import datetime, timedelta
import pandas as pd
import os
from dotenv import load_dotenv
import json
import uuid
import pathlib
import random

# Load environment variables if using .env file
load_dotenv()

def get_db_connection():
    """
    Creates and returns a connection to the database
    """
    try:
        connection = mysql.connector.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', ''),
            database=os.getenv('DB_NAME', 'namma_yatri_db')
        )
        return connection
    except mysql.connector.Error as e:
        print(f"Error connecting to MySQL database: {e}")
        raise e

# Session management functions
def get_sessions_dir():
    """Get or create the sessions directory"""
    base_dir = pathlib.Path(__file__).parent.parent
    sessions_dir = base_dir / "sessions"
    if not sessions_dir.exists():
        sessions_dir.mkdir(exist_ok=True)
    return sessions_dir

def create_session(user_data):
    """Create a new session for a user"""
    session_id = str(uuid.uuid4())
    session_data = {
        "session_id": session_id,
        "user_id": user_data["user_id"],
        "name": user_data["name"],
        "user_type": user_data["user_type"],
        "created_at": datetime.now().isoformat(),
        "expires_at": (datetime.now() + timedelta(hours=24)).isoformat()
    }
    
    session_file = get_sessions_dir() / f"{session_id}.json"
    with open(session_file, "w") as f:
        json.dump(session_data, f)
    
    return session_id

def get_session(session_id):
    """Get session data if valid"""
    try:
        session_file = get_sessions_dir() / f"{session_id}.json"
        if not session_file.exists():
            return None
        
        with open(session_file, "r") as f:
            session_data = json.load(f)
        
        # Check if session has expired
        expires_at = datetime.fromisoformat(session_data["expires_at"])
        if datetime.now() > expires_at:
            delete_session(session_id)
            return None
            
        return session_data
    except Exception as e:
        print(f"Error getting session: {e}")
        return None

def delete_session(session_id):
    """Delete a session"""
    session_file = get_sessions_dir() / f"{session_id}.json"
    if session_file.exists():
        session_file.unlink()

def generate_random_bengaluru_location():
    """Generate a random location within Bengaluru city limits"""
    # Bengaluru boundaries (approximate)
    min_lat, max_lat = 12.8340, 13.0827
    min_lon, max_lon = 77.4799, 77.7145
    
    latitude = round(random.uniform(min_lat, max_lat), 6)
    longitude = round(random.uniform(min_lon, max_lon), 6)
    
    # Popular places in Bengaluru for more realistic locations
    locations = [
        "Indiranagar", "Koramangala", "MG Road", "Whitefield", 
        "Electronic City", "HSR Layout", "Jayanagar", "JP Nagar",
        "Bannerghatta Road", "Yelahanka", "Hebbal", "Marathahalli"
    ]
    location_name = random.choice(locations)
    
    return {
        "latitude": latitude,
        "longitude": longitude,
        "location_name": location_name
    }

def get_rider_location(rider_id):
    """Get a rider's current location"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute(
            "SELECT location, latitude, longitude FROM rider WHERE rider_id = %s", 
            (rider_id,)
        )
        location_data = cursor.fetchone()
        
        if not location_data:
            # If rider has no location, generate and save a random one
            location_data = generate_random_bengaluru_location()
            cursor.execute(
                "INSERT INTO rider (rider_id, location, latitude, longitude) VALUES (%s, %s, %s, %s) "
                "ON DUPLICATE KEY UPDATE location = %s, latitude = %s, longitude = %s",
                (rider_id, location_data["location_name"], location_data["latitude"], location_data["longitude"],
                 location_data["location_name"], location_data["latitude"], location_data["longitude"])
            )
            conn.commit()
        
        return location_data
    finally:
        cursor.close()
        conn.close()

def get_driver_location(driver_id):
    """Get a driver's current location"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute(
            "SELECT location, latitude, longitude FROM driver WHERE driver_id = %s", 
            (driver_id,)
        )
        location_data = cursor.fetchone()
        
        if not location_data:
            # If driver has no location, generate and save a random one
            location_data = generate_random_bengaluru_location()
            cursor.execute(
                "INSERT INTO driver (driver_id, location, latitude, longitude) VALUES (%s, %s, %s, %s) "
                "ON DUPLICATE KEY UPDATE location = %s, latitude = %s, longitude = %s",
                (driver_id, location_data["location_name"], location_data["latitude"], location_data["longitude"],
                 location_data["location_name"], location_data["latitude"], location_data["longitude"])
            )
            conn.commit()
        
        return location_data
    finally:
        cursor.close()
        conn.close()

def update_rider_location(rider_id, location_name, latitude, longitude):
    """Update a rider's current location"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            "UPDATE rider SET location = %s, latitude = %s, longitude = %s WHERE rider_id = %s",
            (location_name, latitude, longitude, rider_id)
        )
        conn.commit()
        return True
    except Exception as e:
        print(f"Error updating rider location: {e}")
        return False
    finally:
        cursor.close()
        conn.close()

def update_driver_location(driver_id, location_name, latitude, longitude):
    """Update a driver's current location"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            "UPDATE driver SET location = %s, latitude = %s, longitude = %s WHERE driver_id = %s",
            (location_name, latitude, longitude, driver_id)
        )
        conn.commit()
        return True
    except Exception as e:
        print(f"Error updating driver location: {e}")
        return False
    finally:
        cursor.close()
        conn.close()

def get_nearest_driver(rider_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Get rider location
        cursor.execute(
            "SELECT latitude, longitude FROM rider WHERE rider_id = %s", 
            (rider_id,)
        )
        rider_location = cursor.fetchone()
        
        if not rider_location:
            return None
        
        # Get available drivers
        cursor.execute(
            "SELECT driver_id, latitude, longitude, "
            "SQRT(POW(69.1 * (latitude - %s), 2) + POW(69.1 * (%s - longitude) * COS(latitude / 57.3), 2)) AS distance "
            "FROM driver WHERE is_available = TRUE "
            "ORDER BY distance ASC LIMIT 5",
            (rider_location["latitude"], rider_location["longitude"])
        )
        nearby_drivers = cursor.fetchall()
        
        return nearby_drivers
    finally:
        cursor.close()
        conn.close()

def book_ride(rider_id, driver_id):
    """Book a ride with a driver"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT ride_id FROM rides WHERE rider_id = %s AND status = 'pending'", (rider_id,))
        if cursor.fetchone():
            return None
        
        cursor.execute("INSERT INTO rides (rider_id, driver_id) VALUES (%s, %s)", (rider_id, driver_id))
        conn.commit()
        cursor.execute("SELECT ride_id FROM rides WHERE rider_id = %s ORDER BY created_at DESC LIMIT 1", (rider_id,))
        ride_id = cursor.fetchone()[0]
        return ride_id
    except Exception as e:
        print(f"Error booking ride: {e}")
        return None
    finally:
        cursor.close()
        conn.close()