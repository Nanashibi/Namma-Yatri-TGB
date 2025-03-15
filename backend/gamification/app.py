from fastapi import FastAPI

app = FastAPI()

@app.get("/coins/{user_id}")
def get_coins(user_id: int):
    return {"user_id": user_id, "coins": 100}