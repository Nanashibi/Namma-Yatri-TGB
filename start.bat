@echo off
echo Starting Namma Yatri Application

echo Setting up database...
python setup_database.py

echo Starting FastAPI server...
start cmd /k uvicorn api_server:app --host 0.0.0.0 --port 5000 --reload

echo Starting React frontend...
cd frontend-react
start cmd /k npm start

echo All services started successfully!
echo API Documentation available at: http://localhost:5000/docs
echo Test accounts:
echo - Admin: admin@nammayatri.com / admin123
echo - customer: customer@example.com / password
echo - Driver: driver@example.com / password
