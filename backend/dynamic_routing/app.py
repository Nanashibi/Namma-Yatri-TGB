from fastapi import FastAPI

app = FastAPI()

@app.get("/route")
def get_route():
    return {"route": "Koramangala to Whitefield"}