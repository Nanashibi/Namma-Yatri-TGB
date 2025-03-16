import mysql.connector
from datetime import datetime, timedelta
import pandas as pd
import os
from dotenv import load_dotenv
import json
import uuid
import pathlib
import random
import jwt

# Load environment variables if using .env file
load_dotenv()

# JWT Secret Key for token generation
JWT_SECRET = os.getenv('JWT_SECRET', 'namma-yatri-secret-key')
JWT_EXPIRATION = int(os.getenv('JWT_EXPIRATION', 86400))  # Default: 24 hours in seconds

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
        "Bengaluru"
    ]
    location_name = random.choice(locations)
    
    return {
        "latitude": latitude,
        "longitude": longitude,
        "location_name": location_name
    }

def ensure_location_data(location_data):
    """Ensure location data is in a consistent format"""
    if not location_data:
        return generate_random_bengaluru_location()
        
    # Convert string values to float if needed
    if 'latitude' in location_data and isinstance(location_data['latitude'], str):
        location_data['latitude'] = float(location_data['latitude'])
    if 'longitude' in location_data and isinstance(location_data['longitude'], str):
        location_data['longitude'] = float(location_data['longitude'])
        
    # Add default values if missing
    if 'latitude' not in location_data or location_data['latitude'] is None:
        location_data['latitude'] = 12.9716
    if 'longitude' not in location_data or location_data['longitude'] is None:
        location_data['longitude'] = 77.5946
    if 'location' not in location_data or not location_data['location']:
        location_data['location'] = "Bengaluru"
        
    return location_data

def get_customer_location(customer_id):
    """Get a customer's current location"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute(
            "SELECT location, latitude, longitude FROM customer WHERE customer_id = %s", 
            (customer_id,)
        )
        location_data = cursor.fetchone()
        
        if not location_data:
            # If customer has no location, generate and save a random one
            location_data = generate_random_bengaluru_location()
            cursor.execute(
                "INSERT INTO customer (customer_id, location, latitude, longitude) VALUES (%s, %s, %s, %s) "
                "ON DUPLICATE KEY UPDATE location = %s, latitude = %s, longitude = %s",
                (customer_id, location_data["location_name"], location_data["latitude"], location_data["longitude"],
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

def update_customer_location(customer_id, location_name, latitude, longitude):
    """Update a customer's current location"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            "UPDATE customer SET location = %s, latitude = %s, longitude = %s WHERE customer_id = %s",
            (location_name, latitude, longitude, customer_id)
        )
        conn.commit()
        return True
    except Exception as e:
        print(f"Error updating customer location: {e}")
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

def update_driver_availability(driver_id, is_available):
    """Update a driver's availability status"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            "UPDATE driver SET is_available = %s WHERE driver_id = %s",
            (is_available, driver_id)
        )
        conn.commit()
        return True
    except Exception as e:
        print(f"Error updating driver availability: {e}")
        conn.rollback()
        return False
    finally:
        cursor.close()
        conn.close()

def get_nearest_driver(customer_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Get customer location
        cursor.execute(
            "SELECT latitude, longitude FROM customer WHERE customer_id = %s", 
            (customer_id,)
        )
        customer_location = cursor.fetchone()
        
        if not customer_location:
            return None
        
        # Get available drivers
        cursor.execute(
            "SELECT driver_id, latitude, longitude, "
            "SQRT(POW(69.1 * (latitude - %s), 2) + POW(69.1 * (%s - longitude) * COS(latitude / 57.3), 2)) AS distance "
            "FROM driver WHERE is_available = TRUE "
            "ORDER BY distance ASC LIMIT 5",
            (customer_location["latitude"], customer_location["longitude"])
        )
        nearby_drivers = cursor.fetchall()
        
        return nearby_drivers
    finally:
        cursor.close()
        conn.close()

def book_ride(customer_id, driver_id):
    """Book a ride with a driver"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT ride_id FROM rides WHERE customer_id = %s AND status = 'pending'", (customer_id,))
        if cursor.fetchone():
            return None
        
        cursor.execute("INSERT INTO rides (customer_id, driver_id) VALUES (%s, %s)", (customer_id, driver_id))
        conn.commit()
        cursor.execute("SELECT ride_id FROM rides WHERE customer_id = %s ORDER BY created_at DESC LIMIT 1", (customer_id,))
        ride_id = cursor.fetchone()[0]
        return ride_id
    except Exception as e:
        print(f"Error booking ride: {e}")
        return None
    finally:
        cursor.close()
        conn.close()

def book_ride_with_coords(customer_id, driver_id, destination, pickup_lat=None, pickup_lng=None, dest_lat=None, dest_lng=None):
    """Book a ride with a driver, including coordinates"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Check if there's already a pending ride for this customer
        cursor.execute("SELECT ride_id FROM rides WHERE customer_id = %s AND status = 'pending'", (customer_id,))
        if cursor.fetchone():
            return None  # Already has a pending ride
        
        # Get customer's pickup location if not provided
        if pickup_lat is None or pickup_lng is None:
            cursor.execute(
                "SELECT latitude, longitude, location FROM customer WHERE customer_id = %s", 
                (customer_id,)
            )
            customer_loc = cursor.fetchone()
            if customer_loc:
                pickup_lat = customer_loc[0]
                pickup_lng = customer_loc[1]
                pickup_location = customer_loc[2] or "Unknown"
            else:
                pickup_location = "Unknown"
        else:
            pickup_location = "Custom Pickup"
        
        # Insert ride with coordinates
        cursor.execute(
            """
            INSERT INTO rides (
                customer_id, 
                driver_id, 
                pickup_location, 
                dropoff_location,
                pickup_lat,
                pickup_lon,
                dropoff_lat,
                dropoff_lon,
                fare,
                status
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'pending')
            """, 
            (
                customer_id, 
                driver_id, 
                pickup_location, 
                destination,
                pickup_lat,
                pickup_lng,
                dest_lat,
                dest_lng,
                calculate_fare(pickup_lat, pickup_lng, dest_lat, dest_lng)
            )
        )
        conn.commit()
        
        # Get the ID of the newly created ride
        cursor.execute(
            "SELECT ride_id FROM rides WHERE customer_id = %s ORDER BY created_at DESC LIMIT 1", 
            (customer_id,)
        )
        ride_id = cursor.fetchone()[0]
        return ride_id
    except Exception as e:
        print(f"Error booking ride: {e}")
        conn.rollback()
        return None
    finally:
        cursor.close()
        conn.close()

def calculate_fare(pickup_lat, pickup_lng, dest_lat, dest_lng):
    """Calculate the fare based on distance between coordinates"""
    # If we don't have coordinates, return a default fare
    if None in (pickup_lat, pickup_lng, dest_lat, dest_lng):
        return 150.00  # Default fare
    
    # Simple distance-based calculation (you can make this more sophisticated)
    from math import radians, sin, cos, sqrt, atan2
    
    # Convert to radians
    lat1, lon1 = radians(float(pickup_lat)), radians(float(pickup_lng))
    lat2, lon2 = radians(float(dest_lat)), radians(float(dest_lng))
    
    # Haversine formula
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    
    # Earth's radius in km
    radius = 6371
    distance = radius * c
    
    # Base fare + distance-based component
    base_fare = 50.0
    per_km_rate = 12.0
    fare = base_fare + (distance * per_km_rate)
    
    return round(fare, 2)

# JWT Authentication functions for React
def generate_jwt_token(user_data):
    """Generate a JWT token for the user"""
    payload = {
        'user_id': user_data['user_id'],
        'name': user_data['name'],
        'user_type': user_data['user_type'],
        'exp': datetime.utcnow() + timedelta(seconds=JWT_EXPIRATION)
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm='HS256')
    return token

def verify_jwt_token(token):
    """Verify a JWT token and return the user data"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None  # Token has expired
    except jwt.InvalidTokenError:
        return None  # Invalid token

# Authentication functions for React
def authenticate_user(email, password):
    """Authenticate a user with email/password for React frontend"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # For debugging
        print(f"Attempting login for email: {email}")
        
        # Secure password comparison should be done here
        # For simplicity, we're using direct comparison (not recommended for production)
        cursor.execute(
            "SELECT user_id, name, user_type FROM users WHERE email = %s AND password_hash = %s", 
            (email, password)
        )
        user = cursor.fetchone()
        
        if user:
            # Generate JWT token for the React frontend
            token = generate_jwt_token(user)
            print(f"Login successful for user: {user['name']}")
            return {
                'success': True,
                'token': token,
                'user': user
            }
        else:
            print(f"Login failed: User not found or incorrect password")
            return {
                'success': False,
                'message': 'Invalid email or password'
            }
    except Exception as e:
        print(f"Login error: {e}")
        return {
            'success': False,
            'message': f'Login error: {str(e)}'
        }
    finally:
        cursor.close()
        conn.close()

def register_user(name, email, password, user_type):
    """Register a new user for React frontend"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # For debugging
        print(f"Attempting registration for email: {email}, user type: {user_type}")
        
        # Check if email already exists
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        if cursor.fetchone():
            print(f"Registration failed: Email already exists")
            return {
                'success': False,
                'message': 'Email already registered'
            }
        
        # Insert new user
        cursor.execute(
            "INSERT INTO users (name, email, password_hash, user_type) VALUES (%s, %s, %s, %s)",
            (name, email, password, user_type)
        )
        user_id = cursor.lastrowid
        
        # Add entry to customer or driver table
        if user_type == "customer":
            cursor.execute(
                "INSERT INTO customer (customer_id) VALUES (%s)", 
                (user_id,)
            )
        elif user_type == "driver":
            cursor.execute(
                "INSERT INTO driver (driver_id, is_available) VALUES (%s, %s)", 
                (user_id, True)
            )
        
        conn.commit()
        print(f"Registration successful for: {name}, ID: {user_id}")
        return {
            'success': True,
            'message': 'Registration successful',
            'user_id': user_id
        }
    except Exception as e:
        print(f"Registration error: {e}")
        if conn:
            conn.rollback()
        return {
            'success': False,
            'message': f'Registration failed: {str(e)}'
        }
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()