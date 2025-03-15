import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { Container, Card, Form, Button, Alert, Nav } from 'react-bootstrap';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  
  const { login, currentUser } = useContext(AuthContext);
  const navigate = useNavigate();

  // Redirect if already logged in
  React.useEffect(() => {
    if (currentUser) {
      if (currentUser.user_type === 'rider') {
        navigate('/rider-dashboard');
      } else if (currentUser.user_type === 'driver') {
        navigate('/driver-dashboard');
      } else if (currentUser.user_type === 'admin') {
        navigate('/admin-dashboard');
      }
    }
  }, [currentUser, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      const userData = await login(email, password);
      
      // Redirect based on user type
      if (userData.user.user_type === 'rider') {
        navigate('/rider-dashboard');
      } else if (userData.user.user_type === 'driver') {
        navigate('/driver-dashboard');
      } else if (userData.user.user_type === 'admin') {
        navigate('/admin-dashboard');
      }
    } catch (error) {
      setError(error.message || 'Failed to log in');
    }
    setLoading(false);
  };

  return (
    <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: "100vh" }}>
      <div className="w-100" style={{ maxWidth: "400px" }}>
        <Card>
          <Card.Body>
            <h2 className="text-center mb-4">Namma Yatri</h2>
            
            <Nav variant="tabs" className="mb-3">
              <Nav.Item>
                <Nav.Link 
                  active={activeTab === 'login'} 
                  onClick={() => setActiveTab('login')}
                >
                  Login
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link
                  as={Link}
                  to="/register"
                  active={activeTab === 'register'}
                >
                  Register
                </Nav.Link>
              </Nav.Item>
            </Nav>
            
            {error && <Alert variant="danger">{error}</Alert>}
            
            <Form onSubmit={handleSubmit}>
              <Form.Group id="email">
                <Form.Label>Email</Form.Label>
                <Form.Control 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </Form.Group>
              
              <Form.Group id="password" className="mt-3">
                <Form.Label>Password</Form.Label>
                <Form.Control 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </Form.Group>
              
              <Button disabled={loading} className="w-100 mt-4" type="submit">
                Log In
              </Button>
            </Form>
          </Card.Body>
        </Card>
        <div className="w-100 text-center mt-2">
          Need an account? <Link to="/register">Register</Link>
        </div>
      </div>
    </Container>
  );
};

export default Login;
