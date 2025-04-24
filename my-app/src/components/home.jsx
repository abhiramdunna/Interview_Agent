// Home.jsx
import React from "react";
import { Link } from "react-router-dom";

function Home({ isAuthenticated, userRole }) {
  return (
    <div style={{ 
      padding: 0,
      margin: 0,
      backgroundColor: '#f0f9ff',
      minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    }}>
      {/* Navigation Bar */}
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
          color: '#0284c7',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline' }}>
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
          </svg>
          Interview Practice App
        </div>
        
        {isAuthenticated ? (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Link 
              to={userRole === "admin" ? "/admin-dashboard" : "/user-dashboard"}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#0284c7",
                color: "white",
                textDecoration: "none",
                borderRadius: "6px",
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'background-color 0.2s',
                ':hover': {
                  backgroundColor: '#0369a1'
                }
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="3" y1="9" x2="21" y2="9"></line>
                <line x1="9" y1="21" x2="9" y2="9"></line>
              </svg>
              Dashboard
            </Link>
            <button 
              onClick={() => {
                localStorage.removeItem("access_token");
                window.location.reload();
              }}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#fef2f2",
                color: "#dc2626",
                border: "1px solid #fee2e2",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s',
                ':hover': {
                  backgroundColor: '#fee2e2'
                }
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
        ) : (
          <Link 
            to="/login?returnTo=/" 
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#0284c7",
              color: "white",
              textDecoration: "none",
              borderRadius: "6px",
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'background-color 0.2s',
              ':hover': {
                backgroundColor: '#0369a1'
              }
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
              <polyline points="10 17 15 12 10 7"></polyline>
              <line x1="15" y1="12" x2="3" y2="12"></line>
            </svg>
            Login
          </Link>
        )}
      </div>

      {/* Main Content */}
      <div style={{ 
        padding: '2rem', 
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Hero Section */}
        <div style={{ 
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '3rem 2rem',
          marginBottom: '2rem',
          textAlign: 'center',
          border: '1px solid #e0e0e0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <h1 style={{ 
            margin: '0 0 1rem 0',
            fontSize: '2.5rem',
            color: '#0f172a',
            fontWeight: '700'
          }}>
            Master Your Technical Interviews
          </h1>
          <p style={{ 
            fontSize: '1.125rem',
            color: '#64748b',
            maxWidth: '700px',
            margin: '0 auto 2rem auto',
            lineHeight: '1.6'
          }}>
            Prepare for your dream job with our comprehensive interview practice platform featuring real-world questions, progress tracking, and personalized recommendations.
          </p>
          {!isAuthenticated && (
            <Link 
              to="/login?returnTo=/"
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#0284c7",
                color: "white",
                textDecoration: "none",
                borderRadius: "8px",
                fontWeight: '500',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'background-color 0.2s',
                ':hover': {
                  backgroundColor: '#0369a1'
                }
              }}
            >
              Get Started
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"></path>
              </svg>
            </Link>
          )}
        </div>

        {/* Features Section */}
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          {/* Feature 1 */}
          <div style={{ 
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '1.5rem',
            border: '1px solid #e0e0e0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <div style={{ 
              width: '48px',
              height: '48px',
              borderRadius: '8px',
              backgroundColor: '#e0f2fe',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
              </svg>
            </div>
            <h3 style={{ 
              margin: '0 0 0.75rem 0',
              color: '#0f172a',
              fontSize: '1.25rem'
            }}>
              Diverse Question Bank
            </h3>
            <p style={{ 
              margin: 0,
              color: '#64748b',
              lineHeight: '1.6'
            }}>
              Practice coding questions from various domains including algorithms, data structures, system design, and more.
            </p>
          </div>

          {/* Feature 2 */}
          <div style={{ 
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '1.5rem',
            border: '1px solid #e0e0e0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <div style={{ 
              width: '48px',
              height: '48px',
              borderRadius: '8px',
              backgroundColor: '#e0f2fe',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
              </svg>
            </div>
            <h3 style={{ 
              margin: '0 0 0.75rem 0',
              color: '#0f172a',
              fontSize: '1.25rem'
            }}>
              Progress Analysis
            </h3>
            <p style={{ 
              margin: 0,
              color: '#64748b',
              lineHeight: '1.6'
            }}>
              Monitor your improvement with detailed analytics and visual progress reports over time.
            </p>
          </div>

          {/* Feature 3 */}
          <div style={{ 
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '1.5rem',
            border: '1px solid #e0e0e0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <div style={{ 
              width: '48px',
              height: '48px',
              borderRadius: '8px',
              backgroundColor: '#e0f2fe',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                <line x1="9" y1="9" x2="9.01" y2="9"></line>
                <line x1="15" y1="9" x2="15.01" y2="9"></line>
              </svg>
            </div>
            <h3 style={{ 
              margin: '0 0 0.75rem 0',
              color: '#0f172a',
              fontSize: '1.25rem'
            }}>
              Personalized Recommendations
            </h3>
            <p style={{ 
              margin: 0,
              color: '#64748b',
              lineHeight: '1.6'
            }}>
              Get tailored question suggestions based on your performance and areas that need improvement.
            </p>
          </div>
        </div>

        {/* Call to Action */}
        {!isAuthenticated && (
          <div style={{ 
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '2rem',
            textAlign: 'center',
            border: '1px solid #e0e0e0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <h2 style={{ 
              margin: '0 0 1rem 0',
              fontSize: '1.75rem',
              color: '#0f172a'
            }}>
              Ready to boost your interview skills?
            </h2>
            <p style={{ 
              fontSize: '1.125rem',
              color: '#64748b',
              maxWidth: '600px',
              margin: '0 auto 1.5rem auto',
              lineHeight: '1.6'
            }}>
              Join thousands of users who have improved their technical interview performance with our platform.
            </p>
            <Link 
              to="/login?returnTo=/" 
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#0284c7",
                color: "white",
                textDecoration: "none",
                borderRadius: "8px",
                fontWeight: '500',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'background-color 0.2s',
                ':hover': {
                  backgroundColor: '#0369a1'
                }
              }}
            >
              Start Practicing Now
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"></path>
              </svg>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;