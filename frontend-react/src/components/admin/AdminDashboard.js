import React, { useState, useEffect, useContext } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Spinner, Alert } from 'react-bootstrap';
import { AuthContext } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import Navbar from '../common/Navbar';
import api from '../../utils/api';

const AdminDashboard = () => {
  const { currentUser } = useContext(AuthContext);
  const [drivers, setDrivers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Fetching admin dashboard data...');

        // Use dummy data if API calls fail in development
        let driversData = [];
        let customersData = [];
        let tripsData = [];
        
        try {
          const driversResponse = await api.get('/admin/drivers');
          driversData = Array.isArray(driversResponse.data) 
            ? driversResponse.data 
            : driversResponse.data?.drivers || [];
          console.log('Drivers data received:', driversData);
        } catch (driverError) {
          console.error('Failed to fetch drivers:', driverError);
          // Use dummy data in development mode
          if (process.env.NODE_ENV === 'development') {
            driversData = [
              {
                driver_id: 1,
                name: 'Ramesh Kumar',
                is_available: true,
                location: 'Koramangala',
                rating: 4.8
              },
              {
                driver_id: 2,
                name: 'Suresh Patel',
                is_available: false,
                location: 'Indiranagar',
                rating: 4.5
              }
            ];
          }
        }
        
        try {
          const customersResponse = await api.get('/admin/customers');
          customersData = Array.isArray(customersResponse.data) 
            ? customersResponse.data 
            : customersResponse.data?.customers || [];
          console.log('Customers data received:', customersData);
        } catch (customerError) {
          console.error('Failed to fetch customers:', customerError);
          // Use dummy data in development mode
          if (process.env.NODE_ENV === 'development') {
            customersData = [
              {
                customer_id: 1,
                name: 'Priya Sharma',
                email: 'priya.s@example.com',
                trip_count: 15
              },
              {
                customer_id: 2,
                name: 'Vikram Iyer',
                email: 'viyer@example.com',
                trip_count: 8
              }
            ];
          }
        }
        
        try {
          const tripsResponse = await api.get('/admin/trips');
          tripsData = Array.isArray(tripsResponse.data) 
            ? tripsResponse.data 
            : tripsResponse.data?.trips || [];
          console.log('Trips data received:', tripsData);
        } catch (tripError) {
          console.error('Failed to fetch trips:', tripError);
          // Use dummy data in development mode
          if (process.env.NODE_ENV === 'development') {
            tripsData = [
              {
                trip_id: 'T12345',
                customer_id: 1,
                customer_name: 'Priya Sharma',
                driver_id: 2,
                driver_name: 'Suresh Patel',
                pickup: 'Koramangala',
                destination: 'Whitefield',
                fare: 250,
                status: 'completed',
                date: '2023-04-15T14:30:00'
              },
              {
                trip_id: 'T12346',
                customer_id: 3,
                customer_name: 'Ananya Desai',
                driver_id: 1,
                driver_name: 'Ramesh Kumar',
                pickup: 'HSR Layout',
                destination: 'Electronic City',
                fare: 300,
                status: 'completed',
                date: '2023-04-16T09:15:00'
              }
            ];
          }
        }
        
        // Update state with fetched data
        setDrivers(driversData);
        setCustomers(customersData);
        setTrips(tripsData);
        
      } catch (error) {
        console.error('Error fetching admin data:', error);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  // Loading state
  if (loading) {
    return (
      <>
        <Navbar />
        <Container className="mt-5 text-center">
          <Spinner animation="border" role="status" />
          <p className="mt-2">Loading admin dashboard data...</p>
        </Container>
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        <Navbar />
        <Container className="mt-5">
          <Alert variant="danger">{error}</Alert>
          <Button onClick={() => window.location.reload()} variant="primary" className="mt-3">
            Retry Loading Data
          </Button>
        </Container>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <Container className="mt-4">
        <Row className="mb-4">
          <Col>
            <h1 className="float-start">Admin Dashboard</h1>
            <Link to="/dynamic-routing" className="float-end">
              <Button variant="primary">Dynamic Routing Analysis</Button>
            </Link>
          </Col>
        </Row>
        <p>Welcome, {currentUser?.name}! Monitor rides and driver performance.</p>
        
        <Row className="mt-4">
          <Col md={4}>
            <Card className="mb-4">
              <Card.Header>System Statistics</Card.Header>
              <Card.Body>
                <div className="d-flex justify-content-between mb-3">
                  <div>Total Drivers:</div>
                  <div><strong>{drivers.length}</strong></div>
                </div>
                <div className="d-flex justify-content-between mb-3">
                  <div>Total Customers:</div>
                  <div><strong>{customers.length}</strong></div>
                </div>
                <div className="d-flex justify-content-between mb-3">
                  <div>Total Trips:</div>
                  <div><strong>{trips.length}</strong></div>
                </div>
                <div className="d-flex justify-content-between">
                  <div>Active Drivers:</div>
                  <div>
                    <strong>
                      {drivers.filter(driver => driver.is_available).length}
                    </strong>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={8}>
            <Card className="mb-4">
              <Card.Header>Recent Trips</Card.Header>
              <Card.Body>
                {trips.length > 0 ? (
                  <Table striped bordered hover responsive>
                    <thead>
                      <tr>
                        <th>Trip ID</th>
                        <th>Customer</th>
                        <th>Driver</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trips.map(trip => (
                        <tr key={trip.trip_id}>
                          <td>{trip.trip_id}</td>
                          <td>{trip.customer_name}</td>
                          <td>{trip.driver_name}</td>
                          <td>
                            <Badge bg={
                              trip.status === 'completed' ? 'success' :
                              trip.status === 'ongoing' ? 'primary' :
                              trip.status === 'cancelled' ? 'danger' : 'warning'
                            }>
                              {trip.status}
                            </Badge>
                          </td>
                          <td>{new Date(trip.date).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                ) : (
                  <p>No trips recorded yet.</p>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
        
        <Row>
          <Col md={6}>
            <Card>
              <Card.Header>Registered Drivers</Card.Header>
              <Card.Body>
                {drivers.length > 0 ? (
                  <Table striped bordered hover responsive>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Status</th>
                        <th>Location</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drivers.map(driver => (
                        <tr key={driver.driver_id}>
                          <td>{driver.driver_id}</td>
                          <td>{driver.name}</td>
                          <td>
                            <Badge bg={driver.is_available ? 'success' : 'danger'}>
                              {driver.is_available ? 'Available' : 'Unavailable'}
                            </Badge>
                          </td>
                          <td>{driver.location || 'Unknown'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                ) : (
                  <p>No drivers registered yet.</p>
                )}
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={6}>
            <Card>
              <Card.Header>Registered Customers</Card.Header>
              <Card.Body>
                {customers.length > 0 ? (
                  <Table striped bordered hover responsive>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Trips</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customers.map(customer => (
                        <tr key={customer.customer_id}>
                          <td>{customer.customer_id}</td>
                          <td>{customer.name}</td>
                          <td>{customer.email}</td>
                          <td>{customer.trip_count || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                ) : (
                  <p>No customers registered yet.</p>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default AdminDashboard;
