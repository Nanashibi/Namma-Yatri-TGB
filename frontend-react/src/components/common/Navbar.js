import React, { useContext } from 'react';
import { Navbar as BootstrapNavbar, Nav, Container, Button } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';

const Navbar = () => {
  const { currentUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/auth');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <BootstrapNavbar bg="dark" variant="dark" expand="md">
      <Container>
        <BootstrapNavbar.Brand as={Link} to="/">Namma Yatri</BootstrapNavbar.Brand>
        <BootstrapNavbar.Toggle aria-controls="navbar-nav" />
        <BootstrapNavbar.Collapse id="navbar-nav">
          <Nav className="me-auto">
            {currentUser && currentUser.user_type === 'customer' && (
              <Nav.Link as={Link} to="/customer-dashboard">Dashboard</Nav.Link>
            )}
            {currentUser && currentUser.user_type === 'driver' && (
              <Nav.Link as={Link} to="/driver-dashboard">Dashboard</Nav.Link>
            )}
            {currentUser && currentUser.user_type === 'admin' && (
              <Nav.Link as={Link} to="/admin-dashboard">Dashboard</Nav.Link>
            )}
          </Nav>
          
          <Nav>
            {currentUser ? (
              <>
                <BootstrapNavbar.Text className="me-3">
                  Signed in as: {currentUser.name}
                </BootstrapNavbar.Text>
                <Button 
                  variant="outline-light" 
                  size="sm"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Nav.Link as={Link} to="/auth">Login</Nav.Link>
                <Nav.Link as={Link} to="/register">Register</Nav.Link>
              </>
            )}
          </Nav>
        </BootstrapNavbar.Collapse>
      </Container>
    </BootstrapNavbar>
  );
};

export default Navbar;
