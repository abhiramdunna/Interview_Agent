import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function UserDashboard() {
  const [admins, setAdmins] = useState([]);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [domains, setDomains] = useState([]);
  const [selectedDomainId, setSelectedDomainId] = useState("");
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [adminPosts, setAdminPosts] = useState([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState({
    username: '',
    email: '',
    role: ''
  });
  const navigate = useNavigate();

  // Fetch current user details
  useEffect(() => {
    const fetchCurrentUser = async () => {
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

        setCurrentUser(response.data);
      } catch (error) {
        console.error("Error fetching user details:", error);
        if (error.response?.status === 401) {
          localStorage.removeItem("access_token");
          navigate("/login");
        }
      }
    };

    fetchCurrentUser();
  }, [navigate]);
  


  // In UserDashboard.jsx - add this useEffect
// Update the existing useEffect for back button handling:

// Update the useEffect for back button handling:

useEffect(() => {
  const handleBackButton = (e) => {
    const token = localStorage.getItem("access_token");
    
    if (!token) {
      // If no token, redirect to login
      navigate("/login", { replace: true });
      return;
    }

    // Prevent default back button behavior
    e.preventDefault();
    // Keep user on dashboard
    navigate('/user-dashboard', { replace: true });
    
    // Update history to prevent back navigation
    window.history.pushState(null, null, '/user-dashboard');
  };

  // Push initial state
  window.history.pushState(null, null, '/user-dashboard');
  window.addEventListener('popstate', handleBackButton);
  
  return () => {
    window.removeEventListener('popstate', handleBackButton);
  };
}, [navigate]);

  // Fetch admin posts
  useEffect(() => {
    const fetchAdminPosts = async () => {
      setIsLoadingPosts(true);
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/admin/posts`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("access_token")}`,
              'Content-Type': 'application/json'
            }
          }
        );
        setAdminPosts(response.data);
      } catch (error) {
        console.error("Error fetching admin posts:", error);
        setError("Failed to load admin posts");
      } finally {
        setIsLoadingPosts(false);
      }
    };
  
    fetchAdminPosts();
  }, []);

  // Fetch admins on component mount
  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) {
          navigate("/");
          return;
        }
    
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/admin/users`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
    
        if (!response.data) {
          throw new Error("No data received from server");
        }
    
        const admins = Array.isArray(response.data) ? response.data : [];
        setAdmins(admins);
        setError("");
        
      } catch (error) {
        console.error("Admin fetch error:", {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
        
        if (error.response?.status === 401) {
          localStorage.removeItem("access_token");
          navigate("/login");
        } else {
          setError(error.response?.data?.detail || "Failed to load admins. Please try again later.");
        }
      }
    };
    
    fetchAdmins();
  }, [navigate]);

  useEffect(() => {
    const fetchDomains = async () => {
      if (!selectedAdmin?.email) {
        return;
      }
      
      setIsLoading(true);
      setError("");
      
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/domains/${selectedAdmin.email}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("access_token")}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (Array.isArray(response.data)) {
          setDomains(response.data);
          if (response.data.length === 0) {
            setError("No domains available for this admin");
          }
        } else {
          throw new Error("Invalid response format from server");
        }
      } catch (error) {
        console.error("Domain fetch error:", error);
        setError(error.response?.data?.detail || "Failed to load domains");
        setDomains([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDomains();
  }, [selectedAdmin]);

  // Fetch questions for selected domain
  useEffect(() => {
    const fetchQuestions = async () => {
      if (!selectedDomainId) return;
      
      setIsLoadingQuestions(true);
      try {
        console.log("Fetching questions for domain:", selectedDomainId);
        const response = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/questions/${selectedDomainId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("access_token")}`,
              'Content-Type': 'application/json'
            }
          }
        );
        setQuestions(response.data);
        setError("");
      } catch (error) {
        console.error("Error fetching questions:", {
          error: error,
          response: error.response,
          config: error.config
        });
        setError("Failed to load questions for this domain.");
        setQuestions([]);
      } finally {
        setIsLoadingQuestions(false);
      }
    };
    
    fetchQuestions();
  }, [selectedDomainId]);

  const startInterview = () => {
    if (!selectedDomainId) {
      setError("Please select a domain");
      return;
    }
  
    if (questions.length === 0) {
      setError("No questions available for this domain");
      return;
    }
  
    // Get the selected domain name
    const selectedDomain = domains.find(d => d.id === selectedDomainId);
    
    navigate(`/interview/${selectedDomainId}/${selectedAdmin.id}`, {
      state: {
        domainName: selectedDomain?.name || "Selected Domain",
        adminName: selectedAdmin.username,
        questions: questions
      }
    });
  };

  const selectAdmin = (admin) => {
    setSelectedAdmin({
        id: admin._id || admin.id, // Handle both MongoDB _id and normalized id
        username: admin.username,
        email: admin.email
    });
    setSelectedDomainId("");
    setQuestions([]);
    setError("");
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    navigate("/");
  };

  const toggleProfileMenu = () => {
    setProfileMenuOpen(!profileMenuOpen);
  };

  const backToAdminSelection = () => {
    setSelectedAdmin(null);
    setSelectedDomainId("");
    setQuestions([]);
    setError("");
  };

  const formatDate = (utcString) => {
    if (!utcString) return "No date available";
  
    try {
      const utcDate = new Date(utcString);
  
      // IST is UTC + 5:30
      const ISTOffset = 330; // in minutes
      const localDate = new Date(utcDate.getTime() + ISTOffset * 60000);
  
      return localDate.toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch (e) {
      console.error("Date formatting error:", e);
      return "Date error";
    }
  };

  // Helper function to get initials for avatar
  const getInitials = (name) => {
    return name ? name.charAt(0).toUpperCase() : "U";
  };

  return (
    <div style={{ 
      padding: '0', 
      margin: '0',
      backgroundColor: '#f0f9ff', // Light sky blue background
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
          color: '#0284c7' // Sky blue color
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }}>
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
          </svg>
          Interview Practice Platform
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {/* Profile Button */}
          <div style={{ position: 'relative' }}>
            <button 
              onClick={toggleProfileMenu}
              style={{ 
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: '#0284c7', // Sky blue
                color: 'white',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '1rem',
                fontWeight: 'bold',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              {getInitials(currentUser.username)}
            </button>
            
            {/* Profile Dropdown Menu */}
            {profileMenuOpen && (
              <div style={{
                position: 'absolute',
                top: '50px',
                right: '0',
                backgroundColor: 'white',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                width: '220px',
                zIndex: 101,
                overflow: 'hidden',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{
                  padding: '1rem',
                  borderBottom: '1px solid #f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <div style={{ 
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: '#0284c7', // Sky blue
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    fontSize: '1rem',
                    fontWeight: 'bold'
                  }}>
                    {getInitials(currentUser.username)}
                  </div>
                  <div>
                    <div style={{ 
                      fontWeight: '600',
                      fontSize: '0.95rem',
                      color: '#334155'
                    }}>
                      {currentUser.username}
                    </div>
                    <div style={{ 
                      color: '#64748b',
                      fontSize: '0.8rem'
                    }}>
                      {currentUser.email}
                    </div>
                  </div>
                </div>
                
                <div style={{ padding: '0.5rem' }}>
                  <button 
                    onClick={handleLogout}
                    style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      width: '100%',
                      border: 'none',
                      borderRadius: '6px',
                      backgroundColor: 'transparent',
                      textAlign: 'left',
                      fontSize: '0.9rem',
                      color: '#ef4444',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ 
        padding: '2rem', 
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        gap: '2rem'
      }}>
        {/* Left Panel - Updates */}
        <div style={{
          flex: '0 0 300px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
        }}>
          {/* Latest Updates Section */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '1.5rem',
            border: '1px solid #e0e0e0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <h3 style={{ 
              marginTop: 0, 
              marginBottom: '1.5rem',
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#0c4a6e',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
              </svg>
              Latest Updates
            </h3>
            {isLoadingPosts ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '2rem',
                color: '#64748b'
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }}>
                  <line x1="12" y1="2" x2="12" y2="6"></line>
                  <line x1="12" y1="18" x2="12" y2="22"></line>
                  <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                  <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                  <line x1="2" y1="12" x2="6" y2="12"></line>
                  <line x1="18" y1="12" x2="22" y2="12"></line>
                  <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                  <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                </svg>
                <div>Loading updates...</div>
              </div>
            ) : (
              <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                {adminPosts.length > 0 ? adminPosts.map((post, index) => (
                  <div 
                    key={post.id || index}
                    style={{
                      padding: '1rem',
                      marginBottom: '1rem',
                      borderRadius: '8px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    <div style={{ 
                      fontWeight: '600', 
                      marginBottom: '0.5rem',
                      color: '#334155',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <div style={{ 
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: '#0284c7', // Sky blue
                        color: 'white',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 'bold'
                      }}>
                        {getInitials(post.admin_name)}
                      </div>
                      {post.admin_name}
                    </div>
                    <p style={{ 
                      margin: '0',
                      fontSize: '0.9rem',
                      color: '#475569',
                      lineHeight: '1.5'
                    }}>
                      {post.content}
                    </p>
                    <div style={{ 
                      fontSize: '0.8rem',
                      color: '#94a3b8',
                      marginTop: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                      {formatDate(post.created_at)}
                    </div>
                  </div>
                )) : (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '2rem',
                    color: '#64748b',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px dashed #cbd5e1'
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '0.5rem', opacity: 0.4 }}>
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <div>No updates available</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Main Content */}
        <div style={{ flex: 1 }}>
          {/* User Info Card */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            border: '1px solid #e0e0e0',
            display: 'flex',
            alignItems: 'center',
            gap: '1.5rem'
          }}>
            <div style={{ 
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: '#0284c7', // Sky blue
              color: 'white',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontSize: '1.5rem',
              fontWeight: 'bold',
              flexShrink: 0
            }}>
              {getInitials(currentUser.username)}
            </div>
            
            <div>
              <h2 style={{ 
                margin: '0 0 0.25rem 0',
                color: '#0f172a',
                fontSize: '1.5rem'
              }}>
                Welcome, {currentUser.username}!
              </h2>
              <p style={{ 
                margin: '0',
                color: '#64748b'
              }}>
                Select an interviewer and domain to practice your interview skills
              </p>
            </div>
          </div>

          {/* Error Display */}
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

          {/* Main Content Area */}
          {!selectedAdmin ? (
            // Admin Selection View
            <div style={{ 
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '1.5rem',
              border: '1px solid #e0e0e0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <h3 style={{ 
                marginTop: 0,
                color: '#0c4a6e', // Dark sky blue
                fontSize: '1.25rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                Select Interviewer
              </h3>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ 
                  marginTop: 0,
                  marginBottom: '1.25rem', 
                  color: '#64748b'
                }}>
                  Choose an admin to start your interview practice session:
                </p>
                
                {admins.length > 0 ? (
                  <div style={{ 
                    borderRadius: '8px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                    gap: '1rem'
                  }}>
                    {admins.map((admin) => (
                      <div 
                        key={admin.id} 
                        style={{ 
                          padding: '1.25rem',
                          cursor: 'pointer',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '10px',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          textAlign: 'center',
                          gap: '0.75rem',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                        }}
                        onClick={() => selectAdmin(admin)}
                      >
                        <div style={{ 
                          width: '60px',
                          height: '60px',
                          borderRadius: '50%',
                          backgroundColor: '#0284c7', // Sky blue
                          color: 'white',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          fontSize: '1.5rem',
                          fontWeight: 'bold'
                        }}>
                          {getInitials(admin.username)}
                        </div>
                        <div>
                          <div style={{ 
                            fontWeight: '600',
                            color: '#334155',
                            fontSize: '1.1rem',
                            marginBottom: '0.25rem'
                          }}>
                            {admin.username}
                          </div>
                          <div style={{ 
                            color: '#64748b',
                            fontSize: '0.875rem'
                          }}>
                            {admin.email}
                          </div>
                        </div>
                        <button style={{
                          marginTop: '0.5rem',
                          padding: '0.5rem 1rem',
                          backgroundColor: '#bae6fd', // Light sky blue
                          color: '#0c4a6e', // Dark sky blue
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: '0.9rem'
                        }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14M12 5l7 7-7 7"></path>
                          </svg>
                          Select 
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '2rem',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px dashed #cbd5e1'
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '0.5rem', opacity: 0.4 }}>
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="8.5" cy="7" r="4"></circle>
                      <line x1="18" y1="8" x2="23" y2="13"></line>
                      <line x1="23" y1="8" x2="18" y2="13"></line>
                    </svg>
                    <div>No admins available</div>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                      Please contact support if you believe this is an error
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Domain Selection View
            <div style={{ 
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '1.5rem',
              border: '1px solid #e0e0e0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.5rem'
              }}>
                <h3 style={{ 
                  margin: 0,
                  color: '#0c4a6e',
                  fontSize: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    <polyline points="3.27 7.96 12 12.01 20.73 7.96"></polyline>
                    <line x1="12" y1="22.08" x2="12" y2="12"></line>
                  </svg>
                  Select Domain for {selectedAdmin.username}
                </h3>
                <button 
                  onClick={backToAdminSelection}
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
                  Back to admins
                </button>
              </div>

              {isLoading ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '2rem',
                  color: '#64748b'
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }}>
                    <line x1="12" y1="2" x2="12" y2="6"></line>
                    <line x1="12" y1="18" x2="12" y2="22"></line>
                    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                    <line x1="2" y1="12" x2="6" y2="12"></line>
                    <line x1="18" y1="12" x2="22" y2="12"></line>
                    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                  </svg>
                  <div>Loading domains...</div>
                </div>
              ) : (
                <>
                  {domains.length > 0 ? (
                    <div style={{ 
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                      gap: '1rem',
                      marginBottom: '1.5rem'
                    }}>
                      {domains.map((domain) => (
                        <div
                          key={domain.id}
                          style={{
                            padding: '1.25rem',
                            backgroundColor: selectedDomainId === domain.id ? '#e0f2fe' : '#f8fafc',
                            border: selectedDomainId === domain.id ? '1px solid #bae6fd' : '1px solid #e2e8f0',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                          }}
                          onClick={() => setSelectedDomainId(domain.id)}
                        >
                          <div style={{ 
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            marginBottom: '0.75rem'
                          }}>
                            <div style={{ 
                              width: '40px',
                              height: '40px',
                              borderRadius: '8px',
                              backgroundColor: '#bae6fd',
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              flexShrink: 0
                            }}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0c4a6e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                              </svg>
                            </div>
                            <div>
                              <div style={{ 
                                fontWeight: '600',
                                color: '#334155',
                                fontSize: '1rem'
                              }}>
                                {domain.name}
                              </div>
                              <div style={{ 
                                color: '#64748b',
                                fontSize: '0.8rem'
                              }}>
                                {domain.description || ''}
                              </div>
                            </div>
                          </div>
                          {selectedDomainId === domain.id && (
                            <div style={{ 
                              display: 'flex',
                              justifyContent: 'flex-end'
                            }}>
                              <div style={{ 
                                padding: '0.25rem 0.5rem',
                                backgroundColor: '#0284c7',
                                color: 'white',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: '500'
                              }}>
                                Selected
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '2rem',
                      backgroundColor: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px dashed #cbd5e1',
                      marginBottom: '1.5rem'
                    }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '0.5rem', opacity: 0.4 }}>
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                        <line x1="3.27" y1="6.96" x2="12" y2="12.01"></line>
                        <line x1="12" y1="22.08" x2="12" y2="12"></line>
                      </svg>
                      <div>No domains available</div>
                      <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                        This admin hasn't created any domains yet
                      </p>
                    </div>
                  )}

              {selectedDomainId && (
                <div style={{ 
                  display: 'flex',
                  justifyContent: 'flex-end',
                  marginTop: '1.5rem'
                }}>
                  <button
                    onClick={startInterview}
                    disabled={isLoadingQuestions || questions.length === 0}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: '#0284c7',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: questions.length === 0 ? 'not-allowed' : 'pointer',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      opacity: questions.length === 0 ? 0.7 : 1,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="23 7 16 12 23 17 23 7"></polygon>
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                    </svg>
                    Start Interview
                  </button>
                </div>
              )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserDashboard;