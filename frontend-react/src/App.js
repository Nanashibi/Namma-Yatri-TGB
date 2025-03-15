import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import RiderDashboard from './components/rider/RiderDashboard';
import DriverDashboard from './components/driver/DriverDashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import ProtectedRoute from './components/common/ProtectedRoute';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Navigate to="/auth" />} />
            <Route path="/auth" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route 
              path="/rider-dashboard" 
              element={
                <ProtectedRoute userType="rider">
                  <RiderDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/driver-dashboard" 
              element={
                <ProtectedRoute userType="driver">
                  <DriverDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin-dashboard" 
              element={
                <ProtectedRoute userType="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
