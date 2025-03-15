from fastapi import APIRouter, Depends, HTTPException, status
from models import LoginRequest, RegisterRequest
from backend.utils.db_utils import authenticate_user, register_user, verify_jwt_token

router = APIRouter()

@router.post("/login", status_code=status.HTTP_200_OK)
async def login(request: LoginRequest):
    try:
        result = authenticate_user(request.email, request.password)
        
        if result['success']:
            return {
                'token': result['token'],
                'user': result['user']
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=result['message']
            )
    except Exception as e:
        print(f"Login endpoint error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {str(e)}"
        )

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest):
    try:
        result = register_user(request.name, request.email, request.password, request.user_type)
        
        if result['success']:
            return {'message': result['message'], 'user_id': result['user_id']}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result['message']
            )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Registration endpoint error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {str(e)}"
        )

@router.get("/verify-session")
async def verify_session(user_data: dict = Depends(verify_jwt_token)):
    return {'user': user_data}