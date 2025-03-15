from fastapi import FastAPI

app = FastAPI()

@app.get("/recommend")
def recommend_driver():
    return {"driver_id": 1, "message": "Driver recommended"}