from typing import Optional
from fastapi import Header, HTTPException, status
from .db_utils import verify_jwt_token
import redis

# Dependency for token verification
async def verify_token(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = authorization.replace("Bearer ", "")
    user_data = verify_jwt_token(token)
    
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    return user_data

# Initialize Redis client
try:
    redis_client = redis.StrictRedis(host='localhost', port=6379, decode_responses=True)
except:
    # Mock redis client for development
    class MockRedis:
        def __init__(self):
            self.data = {}
        
        def hincrby(self, name, key, amount=1):
            if name not in self.data:
                self.data[name] = {}
            if key not in self.data[name]:
                self.data[name][key] = 0
            self.data[name][key] += amount
            return self.data[name][key]
        
        def hget(self, name, key):
            if name in self.data and key in self.data[name]:
                return str(self.data[name][key])
            return '0'
    
    redis_client = MockRedis()

# Define and export demand_model
demand_model = ...  # Add the actual model initialization code here

# Define and export demand_data
demand_data = ...  # Add the actual data initialization code here

# Define and export G (graph)
G = ...  # Add the actual graph initialization code here

# Define and export redis_client
redis_client = ...  # Add the actual Redis client initialization code here
