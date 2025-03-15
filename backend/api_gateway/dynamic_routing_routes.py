from fastapi import APIRouter, Depends, HTTPException, status
import pandas as pd
import numpy as np
import networkx as nx
from utils.db_utils import get_db_connection, verify_jwt_token
from utils.auth_utils import demand_model, demand_data, G, redis_client
from models import PriceVoteRequest

router = APIRouter()

@router.get("/peak-hours")
async def get_peak_hours(user_data: dict = Depends(verify_jwt_token)):
    if user_data['user_type'] != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized"
        )
    
    demand_data["predicted_demand"] = demand_model.predict(demand_data[["hour", "day_of_week", "is_weekend", "searches", "searches_with_estimate", "searches_for_quotes", "searches_with_quotes"]])
    
    peak_hours = (
        demand_data.groupby("hour")["predicted_demand"].sum()
        .sort_values(ascending=False)
        .head(5)
        .index.tolist()
    )
    peak_hours_formatted = [{"hour": hour, "formatted": f"{hour % 12 or 12} {'AM' if hour < 12 else 'PM'}"} for hour in peak_hours]
    
    return peak_hours_formatted

@router.get("/high-demand-wards")
async def get_high_demand_wards(user_data: dict = Depends(verify_jwt_token)):
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

@router.get("/optimal-routes")
async def get_optimal_routes(user_data: dict = Depends(verify_jwt_token)):
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

@router.post("/price-vote")
async def submit_price_vote(request: PriceVoteRequest, user_data: dict = Depends(verify_jwt_token)):
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

@router.get("/price-adjustment")
async def get_price_adjustment(user_data: dict = Depends(verify_jwt_token)):
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