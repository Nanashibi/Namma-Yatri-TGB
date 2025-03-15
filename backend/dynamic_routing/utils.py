import os
import time
from math import radians, sin, cos, sqrt, atan
from db import get_available_drivers, get_driver, update_driver

def haversine(lat1, lon1, lat2, lon2):
    """Calculate the great-circle distance between two points in kilometers."""
    R = 6371

    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon/2) ** 2
    c = 2 * atan(sqrt(a), sqrt(1 - a))
    return R*c

def get_fare(pickup_lat, pickup_lon, dropoff_lat, dropoff_lon):
    """Calculate fare based on distance and peak hours."""
    distance_km = haversine(pickup_lat, pickup_lon, dropoff_lat, dropoff_lon)
    peak_multiplier = 1.5 if is_peak_time() else 1.0
    base_fare = 20
    per_km_rate = 10
    fare = base_fare + (per_km_rate * distance_km * peak_multiplier)
    return round(fare, 2)

def is_peak_time():
    """Determine if the request is made during peak hours (7-10 AM, 5-8 PM)."""
    current_hour = time.localtime().tm_hour
    return (7 <= current_hour <= 10) or (17 <= current_hour <= 20)

def find_nearest_driver(pickup_lat, pickup_lon):
    """Find the nearest available driver within a time-bound search."""
    available_drivers = get_available_drivers()
    timeout = 5
    start_time = time.time()
    while time.time() - start_time < timeout:
        nearest_driver = None
        min_distance = float("inf")
        for driver in available_drivers:
            distance_km = haversine(pickup_lat, pickup_lon, driver["latitude"], driver["longitude"])
            if distance_km < min_distance and distance_km <= 5:
                min_distance = distance_km
                nearest_driver = driver["driver_id"]
        if nearest_driver:
            return nearest_driver
        time.sleep(1)
    return None

def incentive_for_driver(driver_id, amount):
    """Provide incentive to the driver for accepting the ride."""
    driver = get_driver(driver_id)
    driver["balance"] += amount
    update_driver(driver)
    return driver["balance"]