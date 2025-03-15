import React, { useState, useContext, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
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

const RiderDashboard = () => {
  const { currentUser } = useContext(AuthContext);
  const [location, setLocation] = useState(null);
  const [destination, setDestination] = useState('');
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchingDrivers, setSearchingDrivers] = useState(false);

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const response = await api.get(`/riders/${currentUser.user_id}/location`);
        setLocation(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching location:', error);
        setLoading(false);
      }
    };

    fetchLocation();
  }, [currentUser]);

  const handleRefreshLocation = async () => {
    try {
      setLoading(true);
      const response = await api.post(`/riders/${currentUser.user_id}/refresh-location`);
      setLocation(response.data);
      setMessage({ type: 'success', text: 'Location updated successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'danger', text: 'Failed to update location' });
    } finally {
      setLoading(false);
    }
  };

  const handleBookRide = async (e) => {
    e.preventDefault();
    
    if (!destination) {
      setMessage({ type: 'warning', text: 'Please enter a destination' });
      return;
    }
    
    setSearchingDrivers(true);
    try {
      const response = await api.post(`/riders/${currentUser.user_id}/request-ride`, { 
        destination 
      });
      setMessage({ type: 'success', text: 'Searching for drivers near you...' });
    } catch (error) {
      setMessage({ type: 'danger', text: 'Failed to request a ride' });
    } finally {
      setSearchingDrivers(false);
    }
  };

  return (
    <>
      <Navbar />
      <Container className="mt-4">
        <h1>Rider Dashboard</h1>
        <p>Welcome, {currentUser?.name}! Book your ride here.</p>
        
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
                >
                  Refresh Location
                </Button>
              </Card.Body>
            </Card>
            
            <Card className="mt-4">
              <Card.Header>Book a Ride</Card.Header>
              <Card.Body>
                <Form onSubmit={handleBookRide}>
                  <Form.Group>
                    <Form.Label>Enter your destination</Form.Label>
                    <Form.Control 
                      type="text" 
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="Where to?"
                      required
                    />
                  </Form.Group>
                  <Button 
                    variant="success" 
                    type="submit" 
                    className="mt-3"
                    disabled={searchingDrivers}
                  >
                    {searchingDrivers ? 'Searching...' : 'Find Drivers'}
                  </Button>
                </Form>
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

export default RiderDashboard;
