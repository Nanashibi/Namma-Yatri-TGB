import React, { useState, useEffect, useContext } from 'react';
import { Container, Row, Col, Card, Table, Badge } from 'react-bootstrap';
import { AuthContext } from '../../contexts/AuthContext';
import Navbar from '../common/Navbar';
import api from '../../utils/api';

const AdminDashboard = () => {
  const { currentUser } = useContext(AuthContext);
  const [drivers, setDrivers] = useState([]);
  const [customers, setcustomers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // In a real application, these would be actual API calls
        const driversResponse = await api.get('/admin/drivers');
        const customersResponse = await api.get('/admin/customers');
        const tripsResponse = await api.get('/admin/trips');
        
        setDrivers(driversResponse.data || []);
        setcustomers(customersResponse.data || []);
        setTrips(tripsResponse.data || []);
      } catch (error) {
        console.error('Error fetching admin data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <>
      <Navbar />
      <Container className="mt-4">
        <h1>Admin Dashboard</h1>
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
                {loading ? (
                  <p>Loading trip data...</p>
                ) : trips.length > 0 ? (
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
                {loading ? (
                  <p>Loading driver data...</p>
                ) : drivers.length > 0 ? (
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
                {loading ? (
                  <p>Loading customer data...</p>
                ) : customers.length > 0 ? (
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
