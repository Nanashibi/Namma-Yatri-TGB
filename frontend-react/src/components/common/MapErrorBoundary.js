import React from 'react';
import { Card, Button } from 'react-bootstrap';

class MapErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to an error reporting service
    console.error('Map error caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  }

  render() {
    if (this.state.hasError) {
      // Render fallback UI
      return (
        <Card className="h-100">
          <Card.Body className="d-flex flex-column justify-content-center align-items-center">
            <h5>Map couldn't be loaded</h5>
            <p className="text-muted">There was an error loading the map</p>
            <Button variant="primary" onClick={this.handleRetry}>
              Try Again
            </Button>
          </Card.Body>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default MapErrorBoundary;
