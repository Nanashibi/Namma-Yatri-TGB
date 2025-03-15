from fastapi import FastAPI
import pandas as pd
from fastapi.middleware.cors import CORSMiddleware
import os
import math

app = FastAPI()

# Allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update with frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# File paths
DRIVERS_DATA_PATH = os.path.join("..", "..", "datasets", "drivers_data.csv")
RIDES_DATA_PATH = os.path.join("..", "..", "datasets", "rides_data.csv")

# Tier Calculation Function
def calculate_tier(base_acceptance, peak_acceptance, total_rides):
    if base_acceptance >= 0.80 and peak_acceptance >= 0.85 and total_rides >= 200:
        return "Platinum"
    elif base_acceptance >= 0.70 and peak_acceptance >= 0.75 and total_rides >= 100:
        return "Gold"
    elif base_acceptance >= 0.50 and peak_acceptance >= 0.60 and total_rides >= 50:
        return "Silver"
    else:
        return "Bronze"

# Function to get total rides per driver
def get_total_rides():
    rides_df = pd.read_csv(RIDES_DATA_PATH)
    total_rides = rides_df.groupby("driver_id").size().reset_index(name="total_rides")
    return total_rides

# Load and Process Driver Data
def get_driver_data():
    df = pd.read_csv(DRIVERS_DATA_PATH)
    
    # Get total rides from rides_data.csv
    rides_df = get_total_rides()

    # Merge total_rides into drivers data
    df = df.merge(rides_df, on="driver_id", how="left").fillna(0)

    # Ensure values are between 0 and 1
    df["base_acceptance_rate"] = df["base_acceptance_rate"].clip(0, 1)
    df["peak_acceptance_rate"] = df["peak_acceptance_rate"].clip(0, 1)

    # Calculate Rank Score (Weighted)
    df["rank_score"] = (df["base_acceptance_rate"] * 0.3) + (df["peak_acceptance_rate"] * 0.7) + (df["total_rides"] / 1000)

    # Realistic Coin Calculation
    df["coins"] = (
        (df["base_acceptance_rate"] * 50) +  # Base acceptance reward
        (df["peak_acceptance_rate"] * 100) +  # Peak acceptance reward
        (df["total_rides"] * 2)  # Rides bonus (2 coins per ride)
    )

    # Round off to whole number
    df["coins"] = df["coins"].apply(math.floor)

    # Assign Tiers
    df["tier"] = df.apply(lambda row: calculate_tier(row["base_acceptance_rate"], row["peak_acceptance_rate"], row["total_rides"]), axis=1)

    # Sort by Rank Score (Leaderboard)
    df = df.sort_values(by="rank_score", ascending=False).reset_index(drop=True)

    # Assign Rank
    df["rank"] = df.index + 1  # Ranks start from 1

    return df[["driver_id", "rank", "coins", "tier"]].to_dict(orient="records")

# API Endpoint
@app.get("/driver")
def get_leaderboard():
    leaderboard = get_driver_data()
    return {"leaderboard": leaderboard}
