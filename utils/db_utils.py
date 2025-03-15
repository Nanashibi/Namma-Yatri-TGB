import mysql.connector
from datetime import datetime, time
import pandas as pd
import os
from dotenv import load_dotenv

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

def authenticate_user(username, password):
    conn=connection
    cursor=conn.cursor()
    cursor.execute("SELECT user_id FROM users WHERE name=%s AND password_hash=%s", (username, password))
    user=conn.fetchone()
    if user:
        user_id = user[0]
        cursor.execute("SELECT rider_id FROM riders WHERE rider_id = ?", (user_id,))
        rider = cursor.fetchone()
        
        if rider:
            return "Rider", user_id
        cursor.execute("SELECT driver_id FROM drivers WHERE driver_id = ?", (user_id,))
        driver = cursor.fetchone()
        
        if driver:
            return "Driver", user_id
        
        return "User", user_id
    else:
        return None

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