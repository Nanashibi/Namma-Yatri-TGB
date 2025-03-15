import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container, Card, Form, Button, Alert, Nav } from 'react-bootstrap';
import { AuthContext } from '../../contexts/AuthContext';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userType, setUserType] = useState('customer');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  // Email validation function
  const isValidEmail = (email) => {
    const pattern = /^[\w.-]+@[\w.-]+\.\w+$/;
    return pattern.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }
    
    if (!isValidEmail(email)) {
      return setError('Please enter a valid email');
    }
    
    try {
      setError('');
      setLoading(true);
      
      await register({
        name,
        email,
        password,
        user_type: userType
      });
      
      setSuccess(true);
      setTimeout(() => {
        navigate('/auth');
      }, 2000);
    } catch (error) {
      setError(error.message || 'Failed to create an account');
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
                  as={Link}
                  to="/auth"
                >
                  Login
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link
                  active
                >
                  Register
                </Nav.Link>
              </Nav.Item>
            </Nav>
            
            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">Registration successful! Redirecting to login...</Alert>}
            
            <Form onSubmit={handleSubmit}>
              <Form.Group id="name">
                <Form.Label>Full Name</Form.Label>
                <Form.Control 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required 
                />
              </Form.Group>
              
              <Form.Group id="email" className="mt-3">
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
              
              <Form.Group id="password-confirm" className="mt-3">
                <Form.Label>Confirm Password</Form.Label>
                <Form.Control 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required 
                />
              </Form.Group>
              
              <Form.Group id="user-type" className="mt-3">
                <Form.Label>Register as</Form.Label>
                <Form.Select 
                  value={userType}
                  onChange={(e) => setUserType(e.target.value)}
                >
                  <option value="customer">Customer</option>
                  <option value="driver">Driver</option>
                </Form.Select>
              </Form.Group>
              
              <Button disabled={loading} className="w-100 mt-4" type="submit">
                Register
              </Button>
            </Form>
          </Card.Body>
        </Card>
        <div className="w-100 text-center mt-2">
          Already have an account? <Link to="/auth">Log In</Link>
        </div>
      </div>
    </Container>
  );
};

export default Register;
