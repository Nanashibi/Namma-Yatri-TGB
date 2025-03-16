import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Alert, Spinner } from 'react-bootstrap';
import Navbar from '../common/Navbar';
import api from '../../utils/api';

const DynamicRouting = () => {
  // State variables
  const [peakHours, setPeakHours] = useState([]);
  const [highDemandWards, setHighDemandWards] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [alertMessage, setAlertMessage] = useState([]);
  const [wardLocations, setWardLocations] = useState([]);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 12.9716, lng: 77.5946 }); // Default to Bangalore center
  const [isLoading, setIsLoading] = useState(true);
  const [map, setMap] = useState(null);
  
  // Google Maps configuration
  const mapContainerStyle = {
    width: '100%',
    height: '400px',
  };

  useEffect(() => {
    const fetchDemandData = async () => {
      try {
        setIsLoading(true);
        const peakHoursResponse = await api.get('dynamic-routing/peak_hours');
        setPeakHours(peakHoursResponse.data.peak_hours);
        
        const highDemandWardsResponse = await api.get('dynamic-routing/high_demand_wards');
        setHighDemandWards(highDemandWardsResponse.data.high_demand_wards);
        
        const routesResponse = await api.get('dynamic-routing/optimal_routes');
        const routeData = Object.entries(routesResponse.data.routes).map(([from, path]) => ({
          from,
          to: path[path.length - 1],
          path
        }));
        setRoutes(routeData);
        
        // Extract all unique ward names from high demand and routes
        const highDemandSet = new Set(highDemandWardsResponse.data.high_demand_wards);
        const allWards = new Set();
        
        // Add high demand wards
        highDemandWardsResponse.data.high_demand_wards.forEach(ward => allWards.add(ward));
        
        // Add all route origins (low demand)
        routeData.forEach(route => {
          if (!highDemandSet.has(route.from)) {
            allWards.add(route.from);
          }
        });
        
        // Convert ward names to coordinates
        await fetchWardCoordinates(Array.from(allWards), highDemandSet);
        
      } catch (error) {
        console.error("Error fetching demand data:", error);
        setAlertMessage({
          type: 'danger',
          message: 'Failed to load demand forecasting data.'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDemandData();
  }, []);
  
  // Function to geocode ward names to coordinates using the existing Google API
  const fetchWardCoordinates = async (wardNames, highDemandSet) => {
    try {
      const wardLocationsData = [];
      
      // Add a city name to improve geocoding accuracy
      const cityName = "Bangalore"; // Adjust for your city
      
      for (const ward of wardNames) {
        try {
          // Use existing Google API
          const geocoder = new window.google.maps.Geocoder();
          
          // Geocode address
          await new Promise((resolve, reject) => {
            geocoder.geocode(
              { address: `${ward} ward, ${cityName}` },
              (results, status) => {
                if (status === "OK" && results && results.length > 0) {
                  const location = results[0].geometry.location;
                  wardLocationsData.push({
                    name: ward,
                    location: { 
                      lat: location.lat(), 
                      lng: location.lng() 
                    },
                    isHighDemand: highDemandSet.has(ward)
                  });
                  
                  // Set the first high demand ward as map center for better initial view
                  if (highDemandSet.has(ward) && mapCenter.lat === 12.9716) {
                    setMapCenter({ 
                      lat: location.lat(), 
                      lng: location.lng() 
                    });
                  }
                  resolve();
                } else {
                  console.warn(`Could not geocode ward: ${ward}, status: ${status}`);
                  resolve(); // Resolve anyway to continue with other wards
                }
              }
            );
          });
        } catch (error) {
          console.error(`Error geocoding ward ${ward}:`, error);
        }
      }
      
      setWardLocations(wardLocationsData);
      
    } catch (error) {
      console.error("Error in geocoding wards:", error);
      setAlertMessage({
        type: 'warning',
        message: 'Some ward locations could not be geocoded properly.'
      });
    }
  };

  // Function to initialize map
  const onMapLoad = (mapInstance) => {
    setMap(mapInstance);
  };

  // Create markers when map and locations are available
  useEffect(() => {
    if (map && wardLocations.length > 0) {
      // Clear existing markers if any
      wardLocations.forEach(ward => {
        const marker = new window.google.maps.Marker({
          position: ward.location,
          map: map,
          title: ward.name,
          icon: {
            url: ward.isHighDemand
              ? "https://maps.google.com/mapfiles/ms/icons/red-dot.png"
              : "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
          }
        });

        // Add click listener to show info window
        marker.addListener("click", () => {
          const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <div>
                <h5>${ward.name}</h5>
                <p>${ward.isHighDemand ? "High Demand Ward" : "Low Demand Ward"}</p>
              </div>
            `
          });
          infoWindow.open(map, marker);
        });
      });
    }
  }, [map, wardLocations]);

  return (
    <>
      <Navbar />
      <Container className="mt-4">
        <h1>Demand Forecasting & Dynamic Driver Routing</h1>
        {alertMessage.message && (
          <Alert variant={alertMessage.type} onClose={() => setAlertMessage({ type: '', message: '' })} dismissible>
            {alertMessage.message}
          </Alert>
        )}
        
        <Row className="mt-4">
          <Col md={6}>
            <Card className="mb-4">
              <Card.Header>Peak Hours & High-Demand Wards</Card.Header>
              <Card.Body>
                <h5>Predicted Peak Hours:</h5>
                {isLoading ? (
                  <div className="text-center py-3">
                    <Spinner animation="border" variant="primary" />
                  </div>
                ) : (
                  <ul className="list-group mb-3">
                    {peakHours.map((hour, idx) => (
                      <li key={idx} className="list-group-item">
                        {hour}
                      </li>
                    ))}
                  </ul>
                )}
                
                <h5>Predicted High-Demand Wards:</h5>
                {isLoading ? (
                  <div className="text-center py-3">
                    <Spinner animation="border" variant="primary" />
                  </div>
                ) : (
                  <ul className="list-group">
                    {highDemandWards.map((ward, idx) => (
                      <li key={idx} className="list-group-item">
                        {ward}
                      </li>
                    ))}
                  </ul>
                )}
              </Card.Body>
            </Card>
          </Col>
          <Col md={6}>
            <Card className="mb-4">
              <Card.Header>Optimal Driver Routing</Card.Header>
              <Card.Body>
                {isLoading ? (
                  <div className="text-center py-3">
                    <Spinner animation="border" variant="primary" />
                  </div>
                ) : (
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
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
        
        <Row className="mt-4 mb-5">
          <Col md={12}>
            <Card>
              <Card.Header>Ward Demand Map</Card.Header>
              <Card.Body>
                {isLoading ? (
                  <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-2">Loading map and geocoding ward locations...</p>
                  </div>
                ) : (
                  <>
                    <div 
                      id="google-map" 
                      style={mapContainerStyle}
                      ref={(mapDiv) => {
                        if (mapDiv && !map) {
                          // Initialize map only once
                          const mapInstance = new window.google.maps.Map(mapDiv, {
                            center: mapCenter,
                            zoom: 12,
                          });
                          onMapLoad(mapInstance);
                        }
                      }}
                    ></div>
                    <div className="mt-3">
                      <div className="d-flex align-items-center mb-2">
                        <div style={{ width: 20, height: 20, backgroundColor: "red", borderRadius: "50%", marginRight: 10 }}></div>
                        <span>High Demand Wards</span>
                      </div>
                      <div className="d-flex align-items-center">
                        <div style={{ width: 20, height: 20, backgroundColor: "blue", borderRadius: "50%", marginRight: 10 }}></div>
                        <span>Low Demand Wards</span>
                      </div>
                    </div>
                  </>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default DynamicRouting;