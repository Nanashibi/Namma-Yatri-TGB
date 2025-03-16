import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './contexts/AuthContext';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import CustomerDashboard from './components/customer/CustomerDashboard';
import DriverDashboard from './components/driver/DriverDashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import DynamicRouting from './components/admin/DynamicRouting';
import ProtectedRoute from './components/common/ProtectedRoute';
import MapErrorBoundary from './components/common/MapErrorBoundary';
import { Spinner, Container } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

// Create a component for the routes to access AuthContext
function AppRoutes() {
  const { authChecked, loading } = useContext(AuthContext);

  // Show loading spinner until authentication check is complete
  if (!authChecked && loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="text-center">
          <Spinner animation="border" role="status" />
          <p className="mt-2">Loading application...</p>
        </div>
      </Container>
    );
  }

  return (
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
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
