import React, { useState, useContext, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Badge } from 'react-bootstrap';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { AuthContext } from '../../contexts/AuthContext';
import Navbar from '../common/Navbar';
import api from '../../utils/api';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for Leaflet marker icon issue in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const DriverDashboard = () => {
  const { currentUser } = useContext(AuthContext);
  const [location, setLocation] = useState(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    const fetchDriverData = async () => {
      try {
        // Get driver location
        const locationResponse = await api.get(`/drivers/${currentUser.user_id}/location`);
        setLocation(locationResponse.data);
        
        // Get driver availability status
        const statusResponse = await api.get(`/drivers/${currentUser.user_id}/status`);
        setIsAvailable(statusResponse.data.is_available);
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching driver data:', error);
        setLoading(false);
      }
    };

    fetchDriverData();
  }, [currentUser]);

  const handleRefreshLocation = async () => {
    try {
      setLoading(true);
      const response = await api.post(`/drivers/${currentUser.user_id}/refresh-location`);
      setLocation(response.data);
      setMessage({ type: 'success', text: 'Location updated successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'danger', text: 'Failed to update location' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAvailability = async () => {
    try {
      setUpdatingStatus(true);
      const response = await api.post(`/drivers/${currentUser.user_id}/update-status`, {
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
                      <p>Loading location data...</p>
                    ) : location ? (
                      <>
                        <p><strong>Area:</strong> {location.location || 'Unknown'}</p>
                        <p><strong>Latitude:</strong> {location.latitude || 'N/A'}</p>
                        <p><strong>Longitude:</strong> {location.longitude || 'N/A'}</p>
                        <p>
                          <strong>Status:</strong>{' '}
                          <Badge bg={isAvailable ? 'success' : 'danger'}>
                            {isAvailable ? 'Available' : 'Not Available'}
                          </Badge>
                        </p>
                      </>
                    ) : (
                      <p>Location data not available</p>
                    )}
                  </Col>
                </Row>
                <Button 
                  variant="primary" 
                  onClick={handleRefreshLocation}
                  disabled={loading}
                  className="me-2"
                >
                  Refresh Location
                </Button>
                <Button 
                  variant={isAvailable ? 'danger' : 'success'} 
                  onClick={handleUpdateAvailability}
                  disabled={updatingStatus}
                >
                  {isAvailable ? 'Go Offline' : 'Go Online'}
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
            {location && location.latitude && location.longitude ? (
              <div style={{ height: '400px', width: '100%' }}>
                <MapContainer 
                  center={[location.latitude, location.longitude]} 
                  zoom={14} 
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[location.latitude, location.longitude]}>
                    <Popup>
                      You are here: {location.location || 'Your location'}
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>
            ) : (
              <Card style={{ height: '400px' }}>
                <Card.Body className="d-flex align-items-center justify-content-center">
                  <p>Map not available</p>
                </Card.Body>
              </Card>
            )}
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default DriverDashboard;
