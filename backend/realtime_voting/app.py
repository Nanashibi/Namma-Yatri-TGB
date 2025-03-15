from fastapi import FastAPI, WebSocket

app = FastAPI()

@app.websocket("/vote")
async def vote(websocket: WebSocket):
    await websocket.accept()
    await websocket.send_text("Vote received")