@echo off
echo Starting Namma Yatri Application

echo Setting up database...
py database/setup_database.py

echo Starting React frontend...
cd frontend-react
start cmd /k npm start

echo All services started successfully!
echo API Documentation available at: http://localhost:5000/docs
echo Test accounts:
echo - Admin: admin@nammayatri.com / admin123
echo - customer: customer@example.com / password
echo - Driver: driver@example.com / password
