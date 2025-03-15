from fastapi import FastAPI

app = FastAPI()

@app.post("/prebook")
def prebook_ride():
    return {"prebooking_id": 1, "status": "pending"}