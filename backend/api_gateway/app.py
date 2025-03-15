from fastapi import FastAPI
from backend.booking.app import router as booking_router
from cancellation.main import router as cancellation_router
from prebooking.app import router as prebooking_router
from dynamic_routing.app import router as dynamic_routing_router
from gamification.app import router as gamification_router
from realtime_voting.app import router as realtime_voting_router
from recommender.app import router as recommender_router

app = FastAPI(title="Nammayatri API Gateway")

# Include routers
app.include_router(booking_router, prefix="/booking", tags=["Booking"])
app.include_router(cancellation_router, prefix="/cancellation", tags=["Cancellation"])
app.include_router(prebooking_router, prefix="/prebooking", tags=["Prebooking"])
app.include_router(dynamic_routing_router, prefix="/dynamic_routing", tags=["Dynamic Routing"])
app.include_router(gamification_router, prefix="/gamification", tags=["Gamification"])
app.include_router(realtime_voting_router, prefix="/realtime_voting", tags=["Realtime Voting"])
app.include_router(recommender_router, prefix="/recommender", tags=["Recommender"])

# Root endpoint
@app.get("/")
def home():
    return {"message": "Welcome to Nammayatri API Gateway"}
