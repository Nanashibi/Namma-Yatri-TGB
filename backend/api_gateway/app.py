from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .auth_routes import router as auth_router
from .customer_routes import router as customer_router
from .driver_routes import router as driver_router
from .admin_routes import router as admin_router
from backend.dynamic_routing.app import router as dynamic_routing_router
from .booking_routes import router as booking_router
from .cancellation_routes import router as cancellation_router
from  backend.prebooking.app import router as prebooking_router
from .gamification_routes import router as gamification_router
from .realtime_voting_routes import router as realtime_voting_router
from .recommender_routes import router as recommender_router

app = FastAPI(
    title="Namma Yatri API",
    description="API for the Namma Yatri ride booking platform",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins in development
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Include routers
app.include_router(auth_router, prefix="/api/auth", tags=["Auth"])
app.include_router(customer_router, prefix="/api/customers", tags=["Customers"])
app.include_router(driver_router, prefix="/api/drivers", tags=["Drivers"])
app.include_router(admin_router, prefix="/api/admin", tags=["Admin"])
app.include_router(dynamic_routing_router, prefix="/api/dynamic-routing", tags=["Dynamic Routing"])
app.include_router(booking_router, prefix="/api/booking", tags=["Booking"])
app.include_router(cancellation_router, prefix="/api/cancellation", tags=["Cancellation"])
app.include_router(prebooking_router, prefix="/api/prebooking", tags=["Prebooking"])
app.include_router(gamification_router, prefix="/api/gamification", tags=["Gamification"])
app.include_router(realtime_voting_router, prefix="/api/realtime-voting", tags=["Realtime Voting"])
app.include_router(recommender_router, prefix="/api/recommender", tags=["Recommender"])

# Root endpoint
@app.get("/")
def home():
    return {"message": "Welcome to Nammayatri API Gateway"}