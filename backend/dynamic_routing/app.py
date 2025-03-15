import pandas as pd
import numpy as np
import redis
import networkx as nx
import streamlit as st
from sklearn.ensemble import RandomForestRegressor
import os

# Load demand data
hourly_demand_path = os.path.join("..","..","datasets", "hourly_demand_data.csv")
od_flows_path = os.path.join("..","..","datasets", "od_flows_data.csv")
demand_data = pd.read_csv(hourly_demand_path)
od_flows = pd.read_csv(od_flows_path)

def train_demand_model():
    features = ["hour", "day_of_week", "is_weekend", "searches", "searches_with_estimate", "searches_for_quotes", "searches_with_quotes"]
    target = "searches"
    
    X = demand_data[features]
    y = demand_data[target]
    
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X, y)
    return model

demand_model = train_demand_model()

redis_client = redis.StrictRedis(host='localhost', port=6379, decode_responses=True)

st.title("Demand Forecasting & Dynamic Driver Routing")

# Predict Peak Demand Hours
st.header("Peak Hours & High-Demand Wards")

demand_data["predicted_demand"] = demand_model.predict(demand_data[["hour", "day_of_week", "is_weekend", "searches", "searches_with_estimate", "searches_for_quotes", "searches_with_quotes"]])

# Convert peak hours to AM/PM format
peak_hours = (
    demand_data.groupby("hour")["predicted_demand"].sum()
    .sort_values(ascending=False)
    .head(5)
    .index.tolist()
)
peak_hours_formatted = [f"{hour % 12 or 12} {'AM' if hour < 12 else 'PM'}" for hour in peak_hours]

high_demand_wards = (
    demand_data.groupby("ward")["predicted_demand"].sum()
    .sort_values(ascending=False)
    .head(5)
    .index.tolist()
)

st.write("### Predicted Peak Hours:")
st.write(peak_hours_formatted)

st.write("### Predicted High-Demand Wards:")
st.write(high_demand_wards)

# Dynamic Driver Routing
st.header("Optimal Driver Routing")
G = nx.Graph()
for _, row in od_flows.iterrows():
    G.add_edge(row["origin_ward"], row["destination_ward"], weight=row["ride_count"])

demand = {ward: demand_data[demand_data["ward"] == ward]["predicted_demand"].sum() for ward in demand_data["ward"].unique()}
available_drivers = {ward: np.random.randint(1, 10) for ward in demand.keys()}  # Mock available drivers per ward

low_demand_wards = sorted(demand, key=lambda x: (demand[x], available_drivers[x]))[:5]
high_demand_wards = sorted(demand, key=lambda x: (demand[x], -available_drivers[x]), reverse=True)[:5]

routes = {}
for ld in low_demand_wards:
    best_route = None
    min_dist = float('inf')
    for hd in high_demand_wards:
        if nx.has_path(G, ld, hd):
            path = nx.shortest_path(G, ld, hd, weight='weight')
            dist = sum(G[u][v]['weight'] for u, v in zip(path[:-1], path[1:]))
            if dist < min_dist:
                best_route = path
                min_dist = dist
    routes[ld] = best_route

st.write("### Suggested Driver Re-Routing:")
for ld, route in routes.items():
    if route:
        st.write(f"Move drivers from Ward {ld} → {' → '.join(map(str, route))}")
    else:
        st.write(f"No suitable route found for Ward {ld}")

# Real-Time Price Adjustment Voting
st.header("Driver Price Adjustment Voting")
driver_id = st.text_input("Driver ID")
vote = st.radio("Vote for Price Adjustment", ["Increase (+1)", "Decrease (-1)"])

if st.button("Submit Vote"):
    vote_value = 1 if vote == "Increase (+1)" else -1
    redis_client.hincrby("price_votes", "total_votes", vote_value)
    redis_client.hincrby("price_votes", "vote_count", 1)
    st.write("Vote Registered Successfully!")

if st.button("Get Price Adjustment"):
    total_votes = int(redis_client.hget("price_votes", "total_votes") or 0)
    vote_count = int(redis_client.hget("price_votes", "vote_count") or 1)  # Avoid division by zero
    adjustment_factor = total_votes / vote_count
    st.write(f"Adjustment Factor: {adjustment_factor}")
