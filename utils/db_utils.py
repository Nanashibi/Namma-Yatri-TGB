import mysql.connector
from datetime import datetime, timedelta
import pandas as pd
import os
from dotenv import load_dotenv
import json
import uuid
import pathlib

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

try:
    connection = mysql.connector.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        user=os.getenv('DB_USER', 'root'),
        password=os.getenv('DB_PASSWORD', ''),
        database=os.getenv('DB_NAME', 'namma_yatri_db')
    )
    print("Connected to database")
except Exception as e:
    print("Error connecting to database", e)

def get_nearest_driver(rider_id):
    conn = connection
    cursor = conn.cursor()
    cursor.execute("SELECT location FROM riders WHERE rider_id = %s", (rider_id,))
    rider_location = cursor.fetchone()
    
    if not rider_location:
        return None
    
    rider_location = rider_location[0]
    cursor.execute("SELECT driver_id, location FROM drivers")
    drivers = cursor.fetchall()
    nearby_drivers = []
    for driver in drivers:
        driver_id, driver_location = driver
        if driver_location == rider_location:
            nearby_drivers.append(driver_id)
    
    return nearby_drivers

def book_ride(rider_id, driver_id):
    conn = connection
    cursor = conn.cursor()
    cursor.execute("SELECT ride_id FROM rides WHERE rider_id = %s", (rider_id,))
    if cursor.fetchone():
        return None
    
    cursor.execute("INSERT INTO rides (rider_id, driver_id) VALUES (%s, %s)", (rider_id, driver_id))
    conn.commit()
    cursor.execute("SELECT ride_id FROM rides WHERE rider_id = %s", (rider_id,))
    ride_id = cursor.fetchone()[0]
    return ride_id