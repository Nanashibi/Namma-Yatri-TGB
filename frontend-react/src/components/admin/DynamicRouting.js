import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Table, Spinner } from 'react-bootstrap';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Polyline } from '@react-google-maps/api';
import Navbar from '../common/Navbar';
import api from '../../utils/api';

const mapContainerStyle = {
  width: '100%',
  height: '400px',
};

const DynamicRouting = () => {
  // State variables
  const [peakHours, setPeakHours] = useState([]);
  const [highDemandWards, setHighDemandWards] = useState([]);
  const [lowDemandWards, setLowDemandWards] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [driverId, setDriverId] = useState('');
  const [priceVote, setPriceVote] = useState('');
  const [adjustmentFactor, setAdjustmentFactor] = useState(0);
  const [alertMessage, setAlertMessage] = useState({ type: '', message: '' });
  const [mapRoutes, setMapRoutes] = useState([]);
  const [selectedMarker, setSelectedMarker] = useState(null);

  // Google Maps API key from environment variables
  const googleMapsApiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';

  // Load Google Maps API with useJsApiLoader hook
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey,
  });

  const mockHighDemandWards = ['Koramangala', 'Indiranagar', 'Whitefield', 'Electronic City', 'HSR Layout'];
  
  // Mock ward locations for demonstration
  const mockWardLocations = {
    'Koramangala': { lat: 12.9352, lng: 77.6245 },
    'Indiranagar': { lat: 12.9784, lng: 77.6408 },
    'Whitefield': { lat: 12.9698, lng: 77.7500 },
    'Electronic City': { lat: 12.8458, lng: 77.6612 },
    'HSR Layout': { lat: 12.9116, lng: 77.6474 },
    'JP Nagar': { lat: 12.9102, lng: 77.5922 },
    'Marathahalli': { lat: 12.9591, lng: 77.6974 },
    'Jayanagar': { lat: 12.9299, lng: 77.5848 },
    'BTM Layout': { lat: 12.9166, lng: 77.6101 },
    'Yelahanka': { lat: 13.1004, lng: 77.5963 }
  };

  useEffect(() => {
    const fetchDemandData = async () => {
      try {
        const peakHoursResponse = await api.get('/peak_hours');
        const highDemandWardsResponse = await api.get('/high_demand_wards');
        const routesResponse = await api.get('/optimal_routes');

        setPeakHours(peakHoursResponse.data.peak_hours);
        setHighDemandWards(highDemandWardsResponse.data.high_demand_wards);
        setLowDemandWards(['JP Nagar', 'Marathahalli', 'Jayanagar', 'BTM Layout', 'Yelahanka']); // Example low demand wards
        setRoutes(Object.entries(routesResponse.data.routes).map(([from, path]) => ({
          from,
          to: path[path.length - 1],
          path
        })));

        const routePaths = Object.entries(routesResponse.data.routes).map(([from, path]) => ({
          from,
          to: path[path.length - 1],
          path: path.map(ward => mockWardLocations[ward])
        }));
        setMapRoutes(routePaths);
      } catch (error) {
        console.error("Error fetching demand data:", error);
        setAlertMessage({
          type: 'danger',
          message: 'Failed to load demand forecasting data.'
        });
      }
    };

    fetchDemandData();
  }, []);

  // Handle driver vote submission
  const handleVoteSubmit = async (e) => {
    e.preventDefault();
    if (!driverId) {
      setAlertMessage({ type: 'warning', message: 'Please enter your Driver ID' });
      return;
    }

    try {
      await api.post('/vote', { driver_id: driverId, vote: priceVote });
      setAlertMessage({
        type: 'success',
        message: 'Vote registered successfully!'
      });
    } catch (error) {
      setAlertMessage({
        type: 'danger',
        message: 'Failed to submit vote. Please try again.'
      });
    }
  };

  const handleGetAdjustment = async () => {
    try {
      const response = await api.get('/price_adjustment');
      setAdjustmentFactor(response.data.adjustment_factor);
    } catch (error) {
      console.error("Error fetching adjustment factor:", error);
      setAlertMessage({
        type: 'danger',
        message: 'Failed to get adjustment factor. Please try again.'
      });
    }
  };

  const onMarkerClick = useCallback((wardName) => {
    setSelectedMarker(wardName);
  }, []);

  const onInfoWindowClose = useCallback(() => {
    setSelectedMarker(null);
  }, []);

  return (
    <>
    <Navbar />
      <Container className="mt-4">
        <h1>Demand Forecasting & Dynamic Driver Routing</h1>

        {alertMessage.message && (
          <Alert variant={alertMessage.type} onClose={() => setAlertMessage({type: '', message: ''})} dismissible>
            {alertMessage.message}
          </Alert>
        )}

        <Row className="mt-4">
          <Col md={6}>
            <Card className="mb-4">
              <Card.Header>Peak Hours & High-Demand Wards</Card.Header>
              <Card.Body>
                <h5>Predicted Peak Hours:</h5>
                <ul className="list-group mb-3">
                  {peakHours.map((hour, idx) => (
                    <li key={idx} className="list-group-item">
                      {hour.formatted}
                    </li>
                  ))}
                </ul>

                <h5>Predicted High-Demand Wards:</h5>
                <ul className="list-group">
                  {highDemandWards.map((ward, idx) => (
                    <li key={idx} className="list-group-item">
                      {ward}
                    </li>
                  ))}
                </ul>
              </Card.Body>
            </Card>

            <Card>
              <Card.Header>Driver Price Adjustment Voting</Card.Header>
              <Card.Body>
                <Form onSubmit={handleVoteSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>Driver ID</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Enter your Driver ID"
                      value={driverId}
                      onChange={(e) => setDriverId(e.target.value)}
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Vote for Price Adjustment</Form.Label>
                    <div>
                      <Form.Check
                        inline
                        type="radio"
                        name="priceVote"
                        id="increase"
                        label="Increase (+1)"
                        value="increase"
                        checked={priceVote === 'increase'}
                        onChange={(e) => setPriceVote(e.target.value)}
                      />
                      <Form.Check
                        inline
                        type="radio"
                        name="priceVote"
                        id="decrease"
                        label="Decrease (-1)"
                        value="decrease"
                        checked={priceVote === 'decrease'}
                        onChange={(e) => setPriceVote(e.target.value)}
                      />
                    </div>
                  </Form.Group>

                  <Button variant="primary" type="submit">
                    Submit Vote
                  </Button>
                </Form>

                <hr />

                <div className="mt-3">
                  <Button variant="secondary" onClick={handleGetAdjustment}>
                    Get Price Adjustment
                  </Button>
                  {adjustmentFactor !== 0 && (
                    <div className="mt-2">
                      <strong>Adjustment Factor: </strong>
                      <span className={adjustmentFactor > 0 ? 'text-success' : 'text-danger'}>
                        {adjustmentFactor}
                      </span>
                    </div>
                  )}
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col md={6}>
            <Card className="mb-4">
              <Card.Header>Optimal Driver Routing</Card.Header>
              <Card.Body>
                <Table responsive striped bordered hover>
                  <thead>
                    <tr>
                      <th>From (Low Demand)</th>
                      <th>To (High Demand)</th>
                      <th>Route</th>
                    </tr>
                  </thead>
                  <tbody>
                    {routes.map((route, idx) => (
                      <tr key={idx}>
                        <td>{route.from}</td>
                        <td>{route.to}</td>
                        <td>{route.path.join(' → ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>

            <Card>
              <Card.Header>Route Visualization</Card.Header>
              <Card.Body>
                {/* Map visualization */}
                <div style={{ height: '400px', width: '100%' }}>
                  {loadError ? (
                    <div className="d-flex flex-column align-items-center justify-content-center h-100">
                      <p className="text-danger mb-3">Failed to load map: {loadError.message}</p>
                      <Button variant="primary" onClick={() => window.location.reload()}>
                        Reload Page
                      </Button>
                    </div>
                  ) : !isLoaded ? (
                    <div className="d-flex justify-content-center align-items-center h-100">
                      <Spinner animation="border" />
                    </div>
                  ) : (
                    <GoogleMap
                      mapContainerStyle={mapContainerStyle}
                      center={{
                        lat: 12.9716,
                        lng: 77.5946 // Bengaluru center
                      }}
                      zoom={12}
                      options={{
                        streetViewControl: false,
                        mapTypeControl: false
                      }}
                    >
                      {/* Render wards as markers */}
                      {Object.entries(mockWardLocations).map(([ward, position]) => (
                        <Marker
                          key={ward}
                          position={position}
                          onClick={() => onMarkerClick(ward)}
                          icon={{
                            url: highDemandWards.includes(ward)
                              ? "https://maps.google.com/mapfiles/ms/icons/red-dot.png"
                              : lowDemandWards.includes(ward)
                                ? "https://maps.google.com/mapfiles/ms/icons/blue-dot.png"
                                : "https://maps.google.com/mapfiles/ms/icons/yellow-dot.png"
                          }}
                        >
                          {selectedMarker === ward && (
                            <InfoWindow
                              position={position}
                              onCloseClick={onInfoWindowClose}
                            >
                              <div>
                                <h6>{ward}</h6>
                                <p>{highDemandWards.includes(ward) 
                                  ? 'High Demand Area' 
                                  : lowDemandWards.includes(ward) 
                                    ? 'Low Demand Area' 
                                    : 'Medium Demand Area'}
                                </p>
                              </div>
                            </InfoWindow>
                          )}
                        </Marker>
                      ))}
                      
                      {/* Render routes as polylines */}
                      {mapRoutes.map((route, idx) => (
                        <Polyline
                          key={idx}
                          path={route.path}
                          options={{
                            strokeColor: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
                            strokeOpacity: 0.8,
                            strokeWeight: 3
                          }}
                        />
                      ))}
                    </GoogleMap>
                  )}
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default DynamicRouting;
