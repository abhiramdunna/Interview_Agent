// App.jsx
import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Login from "./components/Login";
import AdminDashboard from "./components/AdminDashboard";
import UserDashboard from "./components/UserDashboard";
import Home from "./components/home";
import InterviewWindow from "./components/InterviewWindow";
import InterviewAnalysis from "./components/InterviewAnalyis";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>Something went wrong</h2>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const ProtectedRoute = ({ children, requiredRole }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("access_token");
      const role = localStorage.getItem("role");
      const expiresAt = localStorage.getItem("expires_at");
      
      // Check if token exists and is not expired
      if (!token || (expiresAt && new Date(expiresAt) < new Date())) {
        // Clear all auth data
        localStorage.removeItem("access_token");
        localStorage.removeItem("role");
        localStorage.removeItem("email");
        localStorage.removeItem("expires_at");
        
        setIsAuthenticated(false);
        setUserRole(null);
        setIsLoading(false);
        navigate("/login", { replace: true });
        return;
      }

      setIsAuthenticated(true);
      setUserRole(role);

      // If a specific role is required and the user doesn't have it
      if (requiredRole && role !== requiredRole) {
        setIsLoading(false);
        navigate("/", { replace: true });
        return;
      }

      setIsLoading(false);
    };

    checkAuth();
  }, [navigate, requiredRole]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return null; // The useEffect will handle the navigation
  }

  return <ErrorBoundary>{children}</ErrorBoundary>;
};

const AuthWrapper = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("access_token");
      const role = localStorage.getItem("role");
      const expiresAt = localStorage.getItem("expires_at");
      
      if (token && role && (!expiresAt || new Date(expiresAt) > new Date())) {
        setIsAuthenticated(true);
        setUserRole(role);
      } else {
        setIsAuthenticated(false);
        setUserRole(null);
      }
    };

    checkAuth();

    // Listen for storage changes
    const handleStorageChange = () => {
      checkAuth();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return React.cloneElement(children, { isAuthenticated, userRole });
};

function App() {
  return (
    <div className="App" style={{ minHeight: '100vh' }}>
      <BrowserRouter>
        <Routes>
          <Route 
            path="/" 
            element={
              <ErrorBoundary>
                <AuthWrapper>
                  <Home />
                </AuthWrapper>
              </ErrorBoundary>
            } 
          />
          <Route 
            path="/login" 
            element={
              <ErrorBoundary>
                <Login />
              </ErrorBoundary>
            } 
          />
          
          <Route 
            path="/admin-dashboard" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/user-dashboard" 
            element={
              <ProtectedRoute requiredRole="user">
                <UserDashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/interview/:domainId/:adminId" 
            element={
              <ProtectedRoute requiredRole="user">
                <InterviewWindow />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/interview-analysis" 
            element={
              <ProtectedRoute requiredRole="user">
                <InterviewAnalysis />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="*" 
            element={<Navigate to="/" replace />} 
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;