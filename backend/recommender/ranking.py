import pandas as pd
import joblib
import os
import numpy as np

def softmax(x):
    e_x = np.exp(x - np.max(x))
    return e_x / e_x.sum()

def rank_drivers(ride, nearby_drivers, model_path, encoder_path):
    # Check if model and encoder files exist
    if not os.path.exists(model_path) or not os.path.exists(encoder_path):
        raise FileNotFoundError("Model or encoder file not found")

    # Load model and encoder
    model = joblib.load(model_path)
    driver_encoder = joblib.load(encoder_path)

    ranked_drivers = []
    probabilities = []
    for driver in nearby_drivers:
        features = {
            "distance_km": ride["distance_km"],
            "fare": ride["fare"],
            "surge_multiplier": ride["surge_multiplier"],
            "duration_minutes": ride["duration_minutes"],
            "hour": ride["hour"],
            "is_weekend": ride["is_weekend"],
            "fare_per_km": ride["fare"] / ride["distance_km"],
            "is_peak_hour": ride["peak_hour"],
            "experience_months": driver["experience_months"],
            "base_acceptance_rate": driver["base_acceptance_rate"],
            "peak_acceptance_rate": driver["peak_acceptance_rate"],
            "avg_daily_hours": driver["avg_daily_hours"],
            "ward_match": 1 if driver["primary_ward"] == ride["origin_ward"] else 0,
            "day_of_week": ride.get("day_of_week", "Monday"),  # Default to Monday if not provided
            "primary_ward": driver["primary_ward"]
        }
        features_df = pd.DataFrame([features])
        features_df = pd.get_dummies(features_df, columns=["day_of_week", "primary_ward"])

        # Ensure all expected columns are present
        expected_columns = model.get_booster().feature_names
        for col in expected_columns:
            if col not in features_df.columns:
                features_df[col] = 0

        # Reorder columns to match the model's expected input
        features_df = features_df[expected_columns]

        # Encode driver ID using the saved encoder
        driver_id_encoded = driver_encoder.transform([driver["driver_id"]])[0]
        features_df["driver_id_encoded"] = driver_id_encoded

        # Predict acceptance probability
        probability = model.predict(features_df)[0]
        probabilities.append(probability)
        ranked_drivers.append({"driver_id": driver["driver_id"], "probability": probability})

    # Apply softmax to probabilities
    softmax_probabilities = softmax(np.array(probabilities))
    for i, driver in enumerate(ranked_drivers):
        driver["probability"] = softmax_probabilities[i]

    # Sort by probability (descending)
    ranked_drivers.sort(key=lambda x: x["probability"], reverse=True)
    return ranked_drivers

def main():
    ride = {
        "distance_km": 10.5,
        "fare": 250.0,
        "surge_multiplier": 1.2,
        "duration_minutes": 30,
        "hour": 18,  # 6 PM
        "is_weekend": 0,  # Weekday
        "peak_hour": 1,  # Peak hour
        "origin_ward": "Hennur",
        "day_of_week": "Monday"  # Added day_of_week
    }

    nearby_drivers = [
        {
            "driver_id": "DRV0001",
            "experience_months": 36,
            "base_acceptance_rate": 0.75,
            "peak_acceptance_rate": 0.65,
            "avg_daily_hours": 8,
            "primary_ward": "Hennur"
        },
        {
            "driver_id": "DRV0002",
            "experience_months": 24,
            "base_acceptance_rate": 0.80,
            "peak_acceptance_rate": 0.70,
            "avg_daily_hours": 9,
            "primary_ward": "Indiranagar"
        },
        {
            "driver_id": "DRV0003",
            "experience_months": 48,
            "base_acceptance_rate": 0.85,
            "peak_acceptance_rate": 0.75,
            "avg_daily_hours": 10,
            "primary_ward": "Hennur"
        }
    ]

    model_path = os.path.join("..","trained_models", "driver_ranker_model.pkl")
    encoder_path = os.path.join("..","trained_models", "driver_encoder.pkl")

    ranked_drivers = rank_drivers(ride, nearby_drivers, model_path, encoder_path)

    print("Ranked Drivers:")
    for driver in ranked_drivers:
        print(driver)

if __name__ == "__main__":
    main()
