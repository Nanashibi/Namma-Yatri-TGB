# Namma Yatri - Ride Booking Platform

A ride booking platform built with React frontend and Python FastAPI backend.

## Project Structure

- `frontend-react/`: React frontend application
- `utils/`: Backend utility functions
- `api_server.py`: FastAPI server for connecting React with the backend

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- Python (v3.7 or higher)
- MySQL database

### Backend Setup

1. Install Python dependencies:
   ```
   pip install -r requirements.txt
   ```

2. Set up environment variables in a `.env` file at the project root:
   ```
   DB_HOST=localhost
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_NAME=namma_yatri_db
   JWT_SECRET=your_secret_key_for_jwt
   ```

3. Start the FastAPI server:
   ```
   uvicorn api_server:app --reload
   ```

### Frontend Setup

1. Navigate to the React frontend directory:
   ```
   cd frontend-react
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the frontend-react directory:
   ```
   REACT_APP_API_URL=http://localhost:5000/api
   REACT_APP_USE_MOCK_API=false
   ```

4. Start the React development server:
   ```
   npm start
   ```

### Quick Start (Windows)

On Windows, you can use the provided batch script to start both servers:
```
start.bat
```

## API Documentation

FastAPI provides interactive API documentation automatically:

- **Swagger UI**: http://localhost:5000/docs
- **ReDoc**: http://localhost:5000/redoc

### Authentication Endpoints

- **POST /api/auth/login** - Authenticate a user
- **POST /api/auth/register** - Register a new user
- **GET /api/auth/verify-session** - Verify a user's JWT token

### customer Endpoints

- **GET /api/customers/:customer_id/location** - Get a customer's location
- **POST /api/customers/:customer_id/refresh-location** - Update a customer's location
- **POST /api/customers/:customer_id/request-ride** - Request a ride

### Driver Endpoints

- **GET /api/drivers/:driver_id/location** - Get a driver's location
- **POST /api/drivers/:driver_id/refresh-location** - Update a driver's location
- **GET /api/drivers/:driver_id/status** - Get a driver's availability status
- **POST /api/drivers/:driver_id/update-status** - Update a driver's availability status

### Admin Endpoints

- **GET /api/admin/drivers** - Get all drivers
- **GET /api/admin/customers** - Get all customers
- **GET /api/admin/trips** - Get all trips

## Development Notes

- To use mock API data instead of connecting to the FastAPI backend, set `REACT_APP_USE_MOCK_API=true` in the frontend .env file.
- The JWT token expiration is set to 24 hours by default. You can configure this with the JWT_EXPIRATION environment variable (in seconds).
- FastAPI's automatic validation ensures that all incoming requests are properly validated before processing.