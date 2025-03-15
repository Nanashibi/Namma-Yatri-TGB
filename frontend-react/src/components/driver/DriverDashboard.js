import React, { useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { Container, Row, Col, Card, Button, Alert, Badge, Spinner } from 'react-bootstrap';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { AuthContext } from '../../contexts/AuthContext';
import Navbar from '../common/Navbar';
import api from '../../utils/api';

const mapContainerStyle = {
  width: '100%',
  height: '400px',
};

const DriverDashboard = () => {
  const { currentUser } = useContext(AuthContext);
  const [location, setLocation] = useState(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showInfoWindow, setShowInfoWindow] = useState(false);

  // Google Maps API key from environment variables
  const googleMapsApiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
  
  // Default center in Bengaluru
  const defaultCenter = useMemo(() => ({ lat: 12.9716, lng: 77.5946 }), []);

  // Load Google Maps API with useJsApiLoader hook
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey,
  });

  // Function to fetch driver data
  const fetchDriverData = useCallback(async () => {
    if (!currentUser || !currentUser.user_id) return;
    
    try {
      setLoading(true);
      console.log(`Fetching data for driver ID: ${currentUser.user_id}`);
      
      // Get driver location
      const locationResponse = await api.get(`/drivers/${currentUser.user_id}/location`);
      console.log("Location data received:", locationResponse.data);
      
      if (locationResponse.data && locationResponse.data.latitude && locationResponse.data.longitude) {
        setLocation({
          ...locationResponse.data,
          // Ensure location data is properly typed as numbers
          latitude: Number(locationResponse.data.latitude),
          longitude: Number(locationResponse.data.longitude)
        });
      }
      
      // Get driver availability status
      const statusResponse = await api.get(`/drivers/${currentUser.user_id}/status`);
      console.log("Status data received:", statusResponse.data);
      setIsAvailable(statusResponse.data.is_available);
      
    } catch (error) {
      console.error('Error fetching driver data:', error);
      setMessage({ type: 'danger', text: 'Failed to load driver data' });
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Initial data loading
  useEffect(() => {
    if (currentUser) {
      fetchDriverData();
    }
  }, [currentUser, fetchDriverData]);

  const handleRefreshLocation = async () => {
    try {
      setLoading(true);
      const response = await api.post(`/drivers/${currentUser.user_id}/refresh-location`);
      
      if (response.data) {
        setLocation({
          location: response.data.location_name,
          latitude: Number(response.data.latitude),
          longitude: Number(response.data.longitude)
        });
      }
      
      setMessage({ type: 'success', text: 'Location updated successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error refreshing location:', error);
      setMessage({ type: 'danger', text: 'Failed to update location' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAvailability = async () => {
    try {
      setUpdatingStatus(true);
      await api.post(`/drivers/${currentUser.user_id}/update-status`, {
        is_available: !isAvailable
      });
      setIsAvailable(!isAvailable);
      setMessage({ 
        type: 'success', 
        text: `You are now ${!isAvailable ? 'available' : 'unavailable'} for rides` 
      });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'danger', text: 'Failed to update availability status' });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const onMarkerClick = useCallback(() => {
    setShowInfoWindow(true);
  }, []);

  const onInfoWindowClose = useCallback(() => {
    setShowInfoWindow(false);
  }, []);

  const mapCenter = useMemo(() => {
    if (location && location.latitude && location.longitude) {
      return { lat: Number(location.latitude), lng: Number(location.longitude) };
    }
    return defaultCenter;
  }, [location, defaultCenter]);

  return (
    <>
      <Navbar />
      <Container className="mt-4">
        <h1>Driver Dashboard</h1>
        <p>Welcome, {currentUser?.name}! Accept rides and earn coins.</p>
        
        {message && <Alert variant={message.type}>{message.text}</Alert>}
        
        <Row className="mt-4">
          <Col md={6}>
            <Card>
              <Card.Header>Your Current Location</Card.Header>
              <Card.Body>
                <Row>
                  <Col>
                    {loading ? (
                      <div className="text-center">
                        <Spinner animation="border" role="status" />
                        <p className="mt-2">Loading driver data...</p>
                      </div>
                    ) : location ? (
                      <>
                        <p><strong>Area:</strong> {location.location || 'Unknown'}</p>
                        <p><strong>Latitude:</strong> {location.latitude.toFixed(6) || 'N/A'}</p>
                        <p><strong>Longitude:</strong> {location.longitude.toFixed(6) || 'N/A'}</p>
                        <p>
                          <strong>Status:</strong>{' '}
                          <Badge bg={isAvailable ? 'success' : 'danger'}>
                            {isAvailable ? 'Available' : 'Not Available'}
                          </Badge>
                        </p>
                      </>
                    ) : (
                      <p>Location data not available. Please refresh your location.</p>
                    )}
                  </Col>
                </Row>
                <Button 
                  variant="primary" 
                  onClick={handleRefreshLocation}
                  disabled={loading}
                  className="me-2"
                >
                  {loading ? (
                    <>
                      <Spinner 
                        as="span" 
                        animation="border" 
                        size="sm" 
                        role="status" 
                        aria-hidden="true" 
                      />
                      <span className="ms-2">Loading...</span>
                    </>
                  ) : (
                    'Refresh Location'
                  )}
                </Button>
                <Button 
                  variant={isAvailable ? 'danger' : 'success'} 
                  onClick={handleUpdateAvailability}
                  disabled={updatingStatus}
                >
                  {updatingStatus ? (
                    <>
                      <Spinner 
                        as="span" 
                        animation="border" 
                        size="sm" 
                        role="status" 
                        aria-hidden="true" 
                      />
                      <span className="ms-2">Updating...</span>
                    </>
                  ) : (
                    isAvailable ? 'Go Offline' : 'Go Online'
                  )}
                </Button>
              </Card.Body>
            </Card>
            
            <Card className="mt-4">
              <Card.Header>Ride Requests</Card.Header>
              <Card.Body>
                <p>No new ride requests at the moment.</p>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={6}>
            <Card style={{ height: '400px' }} className="overflow-hidden">
              {loadError ? (
                <Card.Body className="d-flex flex-column align-items-center justify-content-center">
                  <p className="text-danger mb-3">Failed to load map: {loadError.message}</p>
                  <Button variant="primary" onClick={() => window.location.reload()}>
                    Reload Page
                  </Button>
                </Card.Body>
              ) : !isLoaded ? (
                <Card.Body className="d-flex justify-content-center align-items-center h-100">
                  <Spinner animation="border" />
                </Card.Body>
              ) : (
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={mapCenter}
                  zoom={14}
                  options={{
                    streetViewControl: false,
                    mapTypeControl: false
                  }}
                >
                  {location && location.latitude && location.longitude && (
                    <Marker
                      position={{
                        lat: Number(location.latitude),
                        lng: Number(location.longitude)
                      }}
                      onClick={onMarkerClick}
                      icon={{
                        url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png"
                      }}
                    >
                      {showInfoWindow && (
                        <InfoWindow
                          position={{
                            lat: Number(location.latitude),
                            lng: Number(location.longitude)
                          }}
                          onCloseClick={onInfoWindowClose}
                        >
                          <div>
                            <h6>Your Location</h6>
                            <p>{location.location || 'Current Position'}</p>
                            <p>Status: {isAvailable ? 'Available' : 'Offline'}</p>
                          </div>
                        </InfoWindow>
                      )}
                    </Marker>
                  )}
                </GoogleMap>
              )}
              
              {loading && isLoaded && (
                <div 
                  className="position-absolute d-flex justify-content-center align-items-center bg-white bg-opacity-75" 
                  style={{ top: 0, left: 0, right: 0, bottom: 0 }}
                >
                  <Spinner animation="border" />
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default DriverDashboard;
