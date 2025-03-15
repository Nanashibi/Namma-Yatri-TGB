import pandas as pd
from sklearn.preprocessing import LabelEncoder

def preprocess_data(rides_path, drivers_path):
    # Load data
    rides = pd.read_csv(rides_path)
    drivers = pd.read_csv(drivers_path)

    # Merge data
    data = pd.merge(rides, drivers, on="driver_id")

    data["fare_per_km"] = data["fare"] / data["distance_km"]
    data["is_peak_hour"] = data["hour"].apply(lambda x: 1 if x in [8, 9, 17, 18, 19, 20, 21] else 0)
    data["ward_match"] = (data["primary_ward"] == data["origin_ward"]).astype(int)

    data = pd.get_dummies(data, columns=["day_of_week", "primary_ward"])

    driver_encoder = LabelEncoder()
    data["driver_id_encoded"] = driver_encoder.fit_transform(data["driver_id"])

    features = ["distance_km", "fare", "surge_multiplier", "duration_minutes", "hour", "is_weekend", "fare_per_km", "is_peak_hour", "experience_months", "base_acceptance_rate", "peak_acceptance_rate", "avg_daily_hours", "ward_match", "driver_id_encoded"]
    X = data[features]
    y = data["driver_id_encoded"]  

    return X, y, driver_encoder