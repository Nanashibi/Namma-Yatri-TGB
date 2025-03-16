import React, { useContext, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { Spinner, Container } from 'react-bootstrap';

const ProtectedRoute = ({ children, userType }) => {
  const { currentUser, loading, authChecked } = useContext(AuthContext);
  const location = useLocation();
  const [redirectUrl, setRedirectUrl] = useState(null);
  const [waitTime, setWaitTime] = useState(0);
  
  // Set a short wait time before redirecting to prevent flashes
  useEffect(() => {
    const timer = setTimeout(() => {
      setWaitTime(waitTime + 1);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [waitTime]);
  
  // Determine where to redirect if needed, but only after initial loading and a short wait
  useEffect(() => {
    if (!loading && authChecked && waitTime > 1) {
      if (!currentUser) {
        setRedirectUrl(`/auth?redirect=${encodeURIComponent(location.pathname)}`);
      } else if (userType && currentUser.user_type !== userType) {
        // User is not authorized for this route, redirect to their dashboard
        if (currentUser.user_type === 'customer') {
          setRedirectUrl('/customer-dashboard');
        } else if (currentUser.user_type === 'driver') {
          setRedirectUrl('/driver-dashboard');
        } else if (currentUser.user_type === 'admin') {
          setRedirectUrl('/admin-dashboard');
        } else {
          // Fallback to login page if user type is unknown
          setRedirectUrl('/auth');
        }
      }
    }
  }, [currentUser, loading, userType, authChecked, location.pathname, waitTime]);
  
  // Show loading spinner while authentication is being checked
  if (loading || !authChecked || waitTime <= 1) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="text-center">
          <Spinner animation="border" role="status" />
          <p className="mt-2">Verifying authentication...</p>
        </div>
      </Container>
    );
  }
  
  // Perform redirection if needed
  if (redirectUrl) {
    return <Navigate to={redirectUrl} replace={true} />;
  }
  
  // User is authenticated and authorized, render the protected component
  return children;
};

export default ProtectedRoute;
