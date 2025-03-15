# from fastapi import FastAPI
# from backend.booking.app import router as booking_router
# from cancellation.main import router as cancellation_router
# from prebooking.app import router as prebooking_router
# from dynamic_routing.app import router as dynamic_routing_router
# from gamification.app import router as gamification_router
# from realtime_voting.app import router as realtime_voting_router
# from recommender.app import router as recommender_router

# app = FastAPI(title="Nammayatri API Gateway")

# # Include routers
# # app.include_router(booking_router, prefix="/booking", tags=["Booking"])
# # app.include_router(cancellation_router, prefix="/cancellation", tags=["Cancellation"])
# # app.include_router(prebooking_router, prefix="/prebooking", tags=["Prebooking"])
# # app.include_router(dynamic_routing_router, prefix="/dynamic_routing", tags=["Dynamic Routing"])
# # app.include_router(gamification_router, prefix="/gamification", tags=["Gamification"])
# # app.include_router(realtime_voting_router, prefix="/realtime_voting", tags=["Realtime Voting"])
# # app.include_router(recommender_router, prefix="/recommender", tags=["Recommender"])

# # Root endpoint
# @app.get("/")
# def home():
#     return {"message": "Welcome to Nammayatri API Gateway"}


from fastapi import FastAPI, Depends, HTTPException, Header, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, Dict, List, Union, Any
import uvicorn
import os
from backend.utils.db_utils import (
    authenticate_user, register_user, verify_jwt_token,
    get_customer_location, update_customer_location, generate_random_bengaluru_location,
    get_driver_location, update_driver_location, get_nearest_driver, book_ride,
    get_db_connection
)

# Add these imports for demand prediction
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
import redis
import networkx as nx
import os

app = FastAPI(
    title="Namma Yatri API",
    description="API for the Namma Yatri ride booking platform",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins in development
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Pydantic models for request validation
class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    user_type: str

class CustomerRequest(BaseModel):
    destination: str
    pickup_lat: Optional[float] = None
    pickup_lng: Optional[float] = None
    destination_lat: Optional[float] = None
    destination_lng: Optional[float] = None

class StatusUpdateRequest(BaseModel):
    is_available: bool

class PriceVoteRequest(BaseModel):
    driver_id: int
    vote: int  # 1 for increase, -1 for decrease

# Dependency for token verification
async def verify_token(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = authorization.replace("Bearer ", "")
    user_data = verify_jwt_token(token)
    
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    return user_data

# Initialize Redis client
try:
    redis_client = redis.StrictRedis(host='localhost', port=6379, decode_responses=True)
except:
    # Mock redis client for development
    class MockRedis:
        def __init__(self):
            self.data = {}
        
        def hincrby(self, name, key, amount=1):
            if name not in self.data:
                self.data[name] = {}
            if key not in self.data[name]:
                self.data[name][key] = 0
            self.data[name][key] += amount
            return self.data[name][key]
        
        def hget(self, name, key):
            if name in self.data and key in self.data[name]:
                return str(self.data[name][key])
            return '0'
    
    redis_client = MockRedis()

# Initialize demand data
try:
    hourly_demand_path = os.path.join("datasets", "hourly_demand_data.csv")
    od_flows_path = os.path.join("datasets", "od_flows_data.csv")
    demand_data = pd.read_csv(hourly_demand_path)
    od_flows = pd.read_csv(od_flows_path)
except:
    # Create mock data if files don't exist
    demand_data = pd.DataFrame({
        'hour': range(24) * 7,
        'day_of_week': [i // 24 for i in range(24 * 7)],
        'is_weekend': [1 if i // 24 >= 5 else 0 for i in range(24 * 7)],
        'ward': ['Koramangala', 'Indiranagar', 'Whitefield', 'Electronic City', 'HSR Layout'] * 33 + ['Koramangala', 'Indiranagar', 'Whitefield'],
        'searches': np.random.randint(50, 500, size=24 * 7),
        'searches_with_estimate': np.random.randint(30, 400, size=24 * 7),
        'searches_for_quotes': np.random.randint(20, 300, size=24 * 7),
        'searches_with_quotes': np.random.randint(10, 200, size=24 * 7),
    })
    
    # Create mock OD flows
    wards = ['Koramangala', 'Indiranagar', 'Whitefield', 'Electronic City', 'HSR Layout', 
             'JP Nagar', 'Marathahalli', 'Jayanagar', 'BTM Layout', 'Yelahanka']
    od_pairs = []
    for origin in wards:
        for destination in wards:
            if origin != destination:
                od_pairs.append({
                    'origin_ward': origin,
                    'destination_ward': destination,
                    'ride_count': np.random.randint(10, 1000)
                })
    od_flows = pd.DataFrame(od_pairs)

# Train demand model
def train_demand_model():
    features = ["hour", "day_of_week", "is_weekend", "searches", "searches_with_estimate", "searches_for_quotes", "searches_with_quotes"]
    target = "searches"
    
    X = demand_data[features]
    y = demand_data[target]
    
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X, y)
    return model

demand_model = train_demand_model()

# Create graph from OD flows
G = nx.Graph()
for _, row in od_flows.iterrows():
    G.add_edge(row["origin_ward"], row["destination_ward"], weight=row["ride_count"])

# Auth routes
@app.post("/api/auth/login", status_code=status.HTTP_200_OK)
async def login(request: LoginRequest):
    try:
        result = authenticate_user(request.email, request.password)
        
        if result['success']:
            return {
                'token': result['token'],
                'user': result['user']
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=result['message']
            )
    except Exception as e:
        print(f"Login endpoint error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {str(e)}"
        )

@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest):
    try:
        result = register_user(request.name, request.email, request.password, request.user_type)
        
        if result['success']:
            return {'message': result['message'], 'user_id': result['user_id']}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result['message']
            )
    except HTTPException:
        # Pass through HTTP exceptions we've already raised
        raise
    except Exception as e:
        print(f"Registration endpoint error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {str(e)}"
        )

@app.get("/api/auth/verify-session")
async def verify_session(user_data: dict = Depends(verify_token)):
    return {'user': user_data}

# Customer routes
@app.get("/api/customers/{customer_id}/location")
async def get_customer_location_api(customer_id: int, user_data: dict = Depends(verify_token)):
    # Verify the user is requesting their own data
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

@app.post("/api/customers/{customer_id}/refresh-location")
async def refresh_customer_location(customer_id: int, user_data: dict = Depends(verify_token)):
    # Verify the user is updating their own data
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

@app.post("/api/customers/{customer_id}/request-ride")
async def request_ride(customer_id: int, request: CustomerRequest, user_data: dict = Depends(verify_token)):
    # Verify the user is requesting their own ride
    if user_data['user_id'] != customer_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized"
        )
    
    # Find nearest driver
    drivers = get_nearest_driver(customer_id)
    if not drivers:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No drivers available"
        )
    
    # Book with the first available driver
    driver_id = drivers[0]['driver_id']
    
    # Include coordinates in the ride booking
    from utils.db_utils import book_ride_with_coords
    
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

# Driver routes
@app.get("/api/drivers/{driver_id}/location")
async def get_driver_location_api(driver_id: int, user_data: dict = Depends(verify_token)):
    # Verify the user is requesting their own data or is an admin
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

@app.post("/api/drivers/{driver_id}/refresh-location")
async def refresh_driver_location(driver_id: int, user_data: dict = Depends(verify_token)):
    # Verify the user is updating their own data
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

@app.get("/api/drivers/{driver_id}/status")
async def get_driver_status(driver_id: int, user_data: dict = Depends(verify_token)):
    # Verify the user is requesting their own data or is an admin
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

@app.post("/api/drivers/{driver_id}/update-status")
async def update_driver_status(driver_id: int, request: StatusUpdateRequest, user_data: dict = Depends(verify_token)):
    # Verify the user is updating their own data
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

# Admin routes
@app.get("/api/admin/drivers")
async def get_all_drivers(user_data: dict = Depends(verify_token)):
    # Verify the user is an admin
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

@app.get("/api/admin/customers")
async def get_all_customers(user_data: dict = Depends(verify_token)):
    # Verify the user is an admin
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

@app.get("/api/admin/trips")
async def get_all_trips(user_data: dict = Depends(verify_token)):
    # Verify the user is an admin
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

# Dynamic routing endpoints
@app.get("/api/dynamic-routing/peak-hours")
async def get_peak_hours(user_data: dict = Depends(verify_token)):
    # Verify the user is an admin
    if user_data['user_type'] != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized"
        )
    
    demand_data["predicted_demand"] = demand_model.predict(demand_data[["hour", "day_of_week", "is_weekend", "searches", "searches_with_estimate", "searches_for_quotes", "searches_with_quotes"]])
    
    # Convert peak hours to AM/PM format
    peak_hours = (
        demand_data.groupby("hour")["predicted_demand"].sum()
        .sort_values(ascending=False)
        .head(5)
        .index.tolist()
    )
    peak_hours_formatted = [{"hour": hour, "formatted": f"{hour % 12 or 12} {'AM' if hour < 12 else 'PM'}"} for hour in peak_hours]
    
    return peak_hours_formatted

@app.get("/api/dynamic-routing/high-demand-wards")
async def get_high_demand_wards(user_data: dict = Depends(verify_token)):
    # Verify the user is an admin
    if user_data['user_type'] != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized"
        )
    
    demand_data["predicted_demand"] = demand_model.predict(demand_data[["hour", "day_of_week", "is_weekend", "searches", "searches_with_estimate", "searches_for_quotes", "searches_with_quotes"]])
    
    high_demand_wards = (
        demand_data.groupby("ward")["predicted_demand"].sum()
        .sort_values(ascending=False)
        .head(5)
        .index.tolist()
    )
    
    return high_demand_wards

@app.get("/api/dynamic-routing/optimal-routes")
async def get_optimal_routes(user_data: dict = Depends(verify_token)):
    # Verify the user is an admin
    if user_data['user_type'] != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized"
        )
    
    demand = {ward: demand_data[demand_data["ward"] == ward]["predicted_demand"].sum() for ward in demand_data["ward"].unique()}
    available_drivers = {ward: np.random.randint(1, 10) for ward in demand.keys()}
    
    low_demand_wards = sorted(demand, key=lambda x: (demand.get(x, 0), available_drivers.get(x, 0)))[:5]
    high_demand_wards = sorted(demand, key=lambda x: (demand.get(x, 0), -available_drivers.get(x, 0)), reverse=True)[:5]
    
    routes = []
    for ld in low_demand_wards:
        for hd in high_demand_wards:
            try:
                if nx.has_path(G, ld, hd):
                    path = nx.shortest_path(G, ld, hd, weight='weight')
                    routes.append({"from": ld, "to": hd, "path": path})
            except:
                continue
    
    return routes[:5]  # Return top 5 routes

@app.post("/api/dynamic-routing/price-vote")
async def submit_price_vote(request: PriceVoteRequest, user_data: dict = Depends(verify_token)):
    # Only allow drivers to vote
    if user_data['user_type'] != 'driver':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only drivers can vote on pricing"
        )
    
    try:
        redis_client.hincrby("price_votes", "total_votes", request.vote)
        redis_client.hincrby("price_votes", "vote_count", 1)
        return {"message": "Vote registered successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to register vote: {str(e)}"
        )

@app.get("/api/dynamic-routing/price-adjustment")
async def get_price_adjustment(user_data: dict = Depends(verify_token)):
    try:
        total_votes = int(redis_client.hget("price_votes", "total_votes") or 0)
        vote_count = int(redis_client.hget("price_votes", "vote_count") or 1)  # Avoid division by zero
        adjustment_factor = total_votes / vote_count
        return {"adjustment_factor": adjustment_factor}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate price adjustment: {str(e)}"
        )

if __name__ == "__main__":
    # Get port from environment variable or use default
    port = int(os.environ.get('PORT', 5000))
    uvicorn.run("api_server:app", host="0.0.0.0", port=port, reload=True)
