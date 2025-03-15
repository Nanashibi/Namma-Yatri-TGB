from fastapi import FastAPI
import pandas as pd
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI()

# Allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update with frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load demand data
DATA_PATH = os.path.join("..", "..", "datasets", "drivers_data.csv")

# Tier Calculation Function
def calculate_tier(base_acceptance, peak_acceptance):
    if base_acceptance >= 0.85 and peak_acceptance >= 0.85:
        return "Platinum"
    elif base_acceptance >= 0.70 and peak_acceptance >= 0.70:
        return "Gold"
    elif base_acceptance >= 0.50 and peak_acceptance >= 0.50:
        return "Silver"
    else:
        return "Bronze"

# Load and Process Driver Data
def get_driver_data():
    df = pd.read_csv(DATA_PATH)

    # Calculate Coins
    df["coins"] = (df["base_acceptance_rate"] * 5) + (df["peak_acceptance_rate"] * 10)

    # Assign Tiers
    df["tier"] = df.apply(lambda row: calculate_tier(row["base_acceptance_rate"], row["peak_acceptance_rate"]), axis=1)

    # Calculate Rank Score (Weighted)
    df["rank_score"] = (df["base_acceptance_rate"] * 0.4) + (df["peak_acceptance_rate"] * 0.6)

    # Sort by Rank Score
    df = df.sort_values(by="rank_score", ascending=False).reset_index(drop=True)

    # Assign Rank
    df["rank"] = df.index + 1  # Ranks start from 1

    return df[["driver_id", "rank", "coins", "tier"]].to_dict(orient="records")

# API Endpoint
@app.get("/driver")
def get_leaderboard():
    leaderboard = get_driver_data()
    return {"leaderboard": leaderboard}

