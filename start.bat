@echo off
echo Starting Namma Yatri Application

echo Starting FastAPI server...
start cmd /k uvicorn api_server:app --host 0.0.0.0 --port 5000 --reload

echo Starting React frontend...
cd frontend-react
start cmd /k npm start

echo Both servers started successfully!
echo API Documentation available at: http://localhost:5000/docs
