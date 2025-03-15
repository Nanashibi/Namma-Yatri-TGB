import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import ndcg_score
import joblib
from data_preprocessing import preprocess_data
import os
import numpy as np

def get_group_sizes(y):
    """Computes group sizes for XGBoost Ranker."""
    unique, counts = np.unique(y, return_counts=True)
    return list(counts)  

def train_model(rides_path, drivers_path, model_save_path, encoder_save_path):
    # Preprocess data
    X, y, driver_encoder = preprocess_data(rides_path, drivers_path)

    # Split data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Compute groups
    group_train = get_group_sizes(y_train)
    group_test = get_group_sizes(y_test)

    # Train XGBoost model
    model = xgb.XGBRanker(objective="rank:pairwise", eval_metric="ndcg")
    model.fit(X_train, y_train, group=group_train)

    # Evaluate
    y_pred = model.predict(X_test)
    print("NDCG Score:", ndcg_score([y_test], [y_pred]))

    # Save model and encoder
    joblib.dump(model, model_save_path)
    joblib.dump(driver_encoder, encoder_save_path)
    print(f"Model saved to {model_save_path}")
    print(f"Encoder saved to {encoder_save_path}")

if __name__ == "__main__":
    train_model(
        os.path.join("..", "datasets", "rides_data.csv"),
        os.path.join("..", "datasets", "drivers_data.csv"),
        os.path.join("trained_models", "driver_ranker_model.pkl"),
        os.path.join("trained_models", "driver_encoder.pkl")
    )
