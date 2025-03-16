import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { Spinner, Container } from 'react-bootstrap';

const ProtectedRoute = ({ children, userType }) => {
  const { currentUser, loading, authChecked } = useContext(AuthContext);
  
  // Show loading spinner while authentication is being checked
  if (loading || !authChecked) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="text-center">
          <Spinner animation="border" role="status" />
          <p className="mt-2">Verifying authentication...</p>
        </div>
      </Container>
    );
  }
  
  // Not logged in, redirect to login page
  if (!currentUser) {
    return <Navigate to="/auth" replace />;
  }

  // Check if the user has the required user type (if specified)
  if (userType && currentUser.user_type !== userType) {
    // User is not authorized for this route, redirect to their dashboard
    if (currentUser.user_type === 'customer') {
      return <Navigate to="/customer-dashboard" replace />;
    } else if (currentUser.user_type === 'driver') {
      return <Navigate to="/driver-dashboard" replace />;
    } else if (currentUser.user_type === 'admin') {
      return <Navigate to="/admin-dashboard" replace />;
    } else {
      // Fallback to login page if user type is unknown
      return <Navigate to="/auth" replace />;
    }
  }
  
  // User is authenticated and authorized, render the protected component
  return children;
};

export default ProtectedRoute;
