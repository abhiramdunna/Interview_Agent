import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function UserProfile() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState({
    username: '',
    email: '',
    role: '',
    createdAt: '',
    completedInterviews: 0,
    averageScore: 0
  });
  const navigate = useNavigate();

  // Fetch current user details
  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) {
          navigate("/");
          return;
        }

        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/current-user`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        // You would need to extend your backend to provide this additional information
        setCurrentUser({
          ...response.data,
          completedInterviews: response.data.completedInterviews || 0,
          averageScore: response.data.averageScore || 0,
          createdAt: response.data.createdAt || new Date().toISOString()
        });
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching user details:", error);
        setError("Failed to load user profile");
        setIsLoading(false);
        if (error.response?.status === 401) {
          localStorage.removeItem("access_token");
          navigate("/login");
        }
      }
    };

    fetchUserDetails();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    navigate("/");
  };

  const handleBackToDashboard = () => {
    navigate("/user-dashboard");
  };

  // Helper function to get initials for avatar
  const getInitials = (name) => {
    return name ? name.charAt(0).toUpperCase() : "U";
  };

  // Format date to readable format
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f0f9ff'
      }}>
        <div style={{ textAlign: 'center' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem' }}>
            <line x1="12" y1="2" x2="12" y2="6"></line>
            <line x1="12" y1="18" x2="12" y2="22"></line>
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
            <line x1="2" y1="12" x2="6" y2="12"></line>
            <line x1="18" y1="12" x2="22" y2="12"></line>
            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
            <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
          </svg>
          <div style={{ color: '#0284c7', fontWeight: '500' }}>Loading profile...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '0', 
      margin: '0',
      backgroundColor: '#f0f9ff',
      minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    }}>
      {/* Top Navigation Bar */}
      <div style={{ 
        backgroundColor: '#ffffff',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        padding: '0.75rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ 
          fontWeight: 'bold',
          fontSize: '1.25rem',
          color: '#0284c7'
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }}>
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
          </svg>
          Interview Practice Platform
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <button 
            onClick={handleBackToDashboard}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#f1f5f9',
              color: '#64748b',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.9rem'
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"></path>
            </svg>
            Back to Dashboard
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div style={{ 
        padding: '2rem', 
        maxWidth: '1000px',
        margin: '0 auto'
      }}>
        {error && (
          <div style={{ 
            padding: '1rem', 
            backgroundColor: '#fef2f2', 
            color: '#b91c1c', 
            borderRadius: '8px',
            marginBottom: '1.5rem',
            border: '1px solid #fee2e2',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <div>{error}</div>
          </div>
        )}
        
        {/* Profile Card */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e0e0e0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          overflow: 'hidden',
          marginBottom: '2rem'
        }}>
          {/* Profile Header */}
          <div style={{
            backgroundColor: '#0284c7',
            padding: '3rem 2rem 6rem',
            position: 'relative'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button 
                onClick={handleLogout}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.9rem'
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                Logout
              </button>
            </div>
          </div>
          
          {/* Profile Info */}
          <div style={{
            marginTop: '-4rem',
            padding: '0 2rem 2rem'
          }}>
            <div style={{
              display: 'flex',
              gap: '1.5rem',
              alignItems: 'flex-end',
              marginBottom: '2rem'
            }}>
              <div style={{ 
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                backgroundColor: '#0369a1',
                color: 'white',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '3rem',
                fontWeight: 'bold',
                border: '5px solid white'
              }}>
                {getInitials(currentUser.username)}
              </div>
              <div>
                <h1 style={{ 
                  margin: '0',
                  color: '#0f172a',
                  fontSize: '2rem'
                }}>
                  {currentUser.username}
                </h1>
                <p style={{ 
                  margin: '0.25rem 0 0 0',
                  color: '#64748b',
                  fontSize: '1rem'
                }}>
                  {currentUser.email}
                </p>
              </div>
            </div>
            
            {/* User Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1.5rem',
              marginBottom: '2rem'
            }}>
              <div style={{
                backgroundColor: '#f8fafc',
                padding: '1.5rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{
                  color: '#64748b',
                  fontSize: '0.9rem',
                  marginBottom: '0.5rem'
                }}>
                  Role
                </div>
                <div style={{
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  color: '#334155'
                }}>
                  {currentUser.role || 'Student'}
                </div>
              </div>
              
              <div style={{
                backgroundColor: '#f8fafc',
                padding: '1.5rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{
                  color: '#64748b',
                  fontSize: '0.9rem',
                  marginBottom: '0.5rem'
                }}>
                  Completed Interviews
                </div>
                <div style={{
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  color: '#334155'
                }}>
                  {currentUser.completedInterviews}
                </div>
              </div>
              
              <div style={{
                backgroundColor: '#f8fafc',
                padding: '1.5rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{
                  color: '#64748b',
                  fontSize: '0.9rem',
                  marginBottom: '0.5rem'
                }}>
                  Average Score
                </div>
                <div style={{
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  color: '#334155'
                }}>
                  {currentUser.averageScore}/10
                </div>
              </div>
            </div>
            
            {/* Additional Info */}
            <div style={{
              backgroundColor: '#f8fafc',
              padding: '1.5rem',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <h3 style={{
                margin: '0 0 1rem 0',
                color: '#334155',
                fontSize: '1.125rem'
              }}>
                Account Information
              </h3>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 2fr',
                gap: '1rem',
                marginBottom: '0.5rem'
              }}>
                <div style={{ color: '#64748b' }}>Username:</div>
                <div style={{ color: '#334155' }}>{currentUser.username}</div>
              </div>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 2fr',
                gap: '1rem',
                marginBottom: '0.5rem'
              }}>
                <div style={{ color: '#64748b' }}>Email:</div>
                <div style={{ color: '#334155' }}>{currentUser.email}</div>
              </div>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 2fr',
                gap: '1rem',
                marginBottom: '0.5rem'
              }}>
                <div style={{ color: '#64748b' }}>Member since:</div>
                <div style={{ color: '#334155' }}>{formatDate(currentUser.createdAt)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserProfile;