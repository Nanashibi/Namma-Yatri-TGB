from fastapi import FastAPI
from queue_manager import QueueManager
from timer_manager import TimerManager

app = FastAPI()
queue_manager = QueueManager()
timer_manager = TimerManager()

@app.post("/prebook/")
async def prebook_ride(ride_id: str, ward: str, pickup_time: str):
    ride_details = {"ride_id": ride_id, "pickup_time": pickup_time}
    queue_manager.add_prebook_ride(ward, ride_details)
    timer_manager.start_acceptance_timer(ward, ride_details)
    return {"message": f"Ride {ride_id} added to {ward} queue"}