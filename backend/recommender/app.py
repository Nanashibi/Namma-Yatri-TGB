from fastapi import FastAPI
from ranking import rank_drivers

router = FastAPI()

@router.post("/recommend")
def recommend_drivers(ride: dict, nearby_drivers: list):
    # Rank drivers
    ranked_drivers = rank_drivers(ride, nearby_drivers, "models/driver_ranker_model.pkl")
    return {"ranked_drivers": ranked_drivers}