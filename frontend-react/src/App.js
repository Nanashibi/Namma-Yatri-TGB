import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import CustomerDashboard from './components/customer/CustomerDashboard';
import DriverDashboard from './components/driver/DriverDashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import DynamicRouting from './components/admin/DynamicRouting';
import ProtectedRoute from './components/common/ProtectedRoute';
import MapErrorBoundary from './components/common/MapErrorBoundary';
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
              path="/customer-dashboard" 
              element={
                <ProtectedRoute userType="customer">
                  <MapErrorBoundary>
                    <CustomerDashboard />
                  </MapErrorBoundary>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/driver-dashboard" 
              element={
                <ProtectedRoute userType="driver">
                  <MapErrorBoundary>
                    <DriverDashboard />
                  </MapErrorBoundary>
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
            <Route 
              path="/dynamic-routing" 
              element={
                <ProtectedRoute userType="admin">
                  <MapErrorBoundary>
                    <DynamicRouting />
                  </MapErrorBoundary>
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
