import React, { useState, useCallback, useRef } from 'react';
import { LoadScript } from '@react-google-maps/api';
import { Spinner, Card, Button } from 'react-bootstrap';

// Limit libraries to improve performance
const libraries = [];

// Create a wrapper component that loads Google Maps API only once
const GoogleMapsWrapper = ({ children, googleMapsApiKey }) => {
  const [loadError, setLoadError] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const loadingTimerRef = useRef(null);

  const handleLoad = useCallback(() => {
    console.log('Google Maps API loaded successfully');
    setIsLoaded(true);
    
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
    }
  }, []);

  const handleError = useCallback((error) => {
    console.error('Error loading Google Maps API:', error);
    setLoadError(error);
    
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
    }
  }, []);

  // Set a timeout for loading the script
  React.useEffect(() => {
    loadingTimerRef.current = setTimeout(() => {
      if (!isLoaded && !loadError) {
        console.warn('Google Maps API loading timeout');
        setLoadError(new Error('Loading timed out'));
      }
    }, 10000); // 10 seconds timeout

    return () => {
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
      }
    };
  }, [isLoaded, loadError]);

  if (loadError) {
    return (
      <Card className="h-100">
        <Card.Body className="d-flex flex-column justify-content-center align-items-center">
          <h5>Failed to load Google Maps</h5>
          <p className="text-muted mb-3">{loadError.message || 'Unknown error'}</p>
          <Button 
            variant="primary" 
            onClick={() => window.location.reload()}
          >
            Reload Page
          </Button>
        </Card.Body>
      </Card>
    );
  }

  return (
    <LoadScript
      googleMapsApiKey={googleMapsApiKey}
      libraries={libraries}
      onLoad={handleLoad}
      onError={handleError}
      loadingElement={
        <div className="h-100 d-flex justify-content-center align-items-center">
          <Spinner animation="border" />
        </div>
      }
    >
      {children}
    </LoadScript>
  );
};

export default React.memo(GoogleMapsWrapper);
