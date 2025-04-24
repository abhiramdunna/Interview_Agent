import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Link } from "react-router-dom";

function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const DEFAULT_ADMIN_EMAIL = import.meta.env.VITE_DEFAULT_ADMIN_EMAIL;
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [showAdminRequest, setShowAdminRequest] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
// In the success case of handleLogin

  const [loginData, setLoginData] = useState({
    email: "",
    password: ""
  });

  const [signupData, setSignupData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    otp: ""
  });

  const [requestData, setRequestData] = useState({
    email: "",
    message: "",
    otp: "",
    full_name: "",
    phone: "",
    password: "",
    confirmPassword: ""
  });

  

  const navigate = useNavigate();

  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginData(prev => ({ ...prev, [name]: value }));
  };

  const handleSignupChange = (e) => {
    const { name, value } = e.target;
    setSignupData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleRequestChange = (e) => {
    const { name, value } = e.target;
    setRequestData(prev => ({ ...prev, [name]: value }));
  };

  const resetAllForms = () => {
    setIsLogin(true);
    setOtpSent(false);
    setOtpVerified(false);
    setShowAdminRequest(false);
    setError("");
    setSignupData({
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      otp: ""
    });
    setRequestData({
      email: "",
      message: "",
      otp: "",
      full_name: "",
      phone: "",
      password: "",
      confirmPassword: ""
    });
  };

  const sendOtp = async (type) => {
    // Determine which email to use based on the form type
    const email = type === "admin" ? requestData.email : signupData.email;
    
    if (!email) {
      setError("Email is required");
      return;
    }
  
    try {
      setIsLoading(true);
      setError("");
      
      // First check if email exists in the database
      const checkResponse = await axios.get(
        `${API_BASE_URL}/check-email?email=${encodeURIComponent(email)}`
      );
      
      if (checkResponse.data.exists) {
        setError("Email already exists. Please use a different email or login.");
        setIsLoading(false);
        return;
      }
      
      // If email doesn't exist, proceed with sending OTP
      const response = await axios.post(
        `${API_BASE_URL}/send-otp?email=${encodeURIComponent(email)}`
      );
  
      if (response.data?.message === "OTP sent successfully") {
        setOtpSent(true);
        setError("");
      } else {
        setError(response.data?.detail || "Failed to send OTP");
      }
    } catch (error) {
      console.error("OTP send error:", error);
      setError(
        error.response?.data?.detail || 
        error.response?.data?.message || 
        "Failed to send OTP. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (type) => {
    // Determine which data to use based on the form type
    const data = type === "admin" ? requestData : signupData;
    
    if (!data.otp) {
      setError("OTP is required");
      return;
    }
    
    try {
      setIsLoading(true);
      setError("");
      
      const response = await axios.post(`${API_BASE_URL}/verify-otp`, {
        email: data.email,
        otp: data.otp
      });
      
      if (response.data?.message === "Email verified successfully") {
        setOtpVerified(true);
        setError("");
      } else {
        setError("OTP verification failed");
      }
    } catch (error) {
      console.error("OTP verification error:", error);
      setError(error.response?.data?.detail || "Invalid OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // In Login.jsx, update the handleLogin function
// Update the handleLogin function
const handleLogin = async (e) => {
  e.preventDefault();
  setIsLoading(true);
  setError("");
  
  // Basic validation
  if (!loginData.email || !loginData.password) {
    setError("Email and password are required");
    setIsLoading(false);
    return;
  }

  try {
    const params = new URLSearchParams();
    params.append("username", loginData.email);
    params.append("password", loginData.password);

    const response = await axios.post(
      `${API_BASE_URL}/token`,
      params,
      { 
        headers: { 
          "Content-Type": "application/x-www-form-urlencoded" 
        }
      }
    );

    if (response.data && response.data.access_token) {
      // Store token and user data
      localStorage.setItem("access_token", response.data.access_token);
      localStorage.setItem("role", response.data.role || "user");
      localStorage.setItem("email", response.data.email);
      
      // Check for pending admin request if user is not admin
      if (response.data.role === "user") {
        try {
          const requestCheck = await axios.get(
            `${API_BASE_URL}/check-admin-request?email=${encodeURIComponent(loginData.email)}`,
            {
              headers: {
                Authorization: `Bearer ${response.data.access_token}`
              }
            }
          );
          
          if (requestCheck.data.pending) {
            setError("Your admin request is still pending approval. Please try again later.");
            localStorage.clear(); // Clear stored data
            setIsLoading(false);
            return; // Stop execution here
          }
        } catch (error) {
          console.error("Error checking admin request:", error);
        }
      }

      // Set expiration
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      localStorage.setItem("expires_at", expiresAt.toISOString());

      // CHECK FOR RETURN URL - this is the new code
      const searchParams = new URLSearchParams(window.location.search);
      const returnTo = searchParams.get("returnTo");
      
      if (returnTo) {
        navigate(returnTo);
      } else {
        // Default navigation based on role
        if (response.data.role === "admin") {
          navigate("/admin-dashboard", { replace: true });
        } else {
          navigate("/user-dashboard", { replace: true });
        }
      }
    } else {
      setError("Invalid response from server");
    }
  } catch (error) {
    // Error handling code stays the same
    console.error("Login error:", error);
    let errorMessage = "Login failed. Please try again.";
    
    if (error.response) {
        if (error.response.status === 400) {
        errorMessage = error.response.data.detail || "Invalid email or password";
      } else if (error.response.status === 401) {
        errorMessage = "Unauthorized. Please check your credentials.";
      } else {
        errorMessage = error.response.data?.detail || errorMessage;
      }
    } else if (error.request) {
      errorMessage = "No response from server. Please check your connection.";
    }
    
    setError(errorMessage);
  } finally {
    setIsLoading(false);
  }
};

  const handleSignup = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
  
    // Frontend validation
    if (!signupData.username || !signupData.email || !signupData.password || !signupData.confirmPassword) {
      setError("All fields are required");
      setIsLoading(false);
      return;
    }
    
    if (signupData.password !== signupData.confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }
  
    // Check if username contains only letters
    if (!/^[a-zA-Z]+$/.test(signupData.username)) {
      setError("Username must contain only alphabets");
      setIsLoading(false);
      return;
    }
    
    // Check minimum username length
    if (signupData.username.length < 3) {
      setError("Username must be at least 3 characters long");
      setIsLoading(false);
      return;
    }
  
    // Check if username is not similar to email name part
    const emailNamePart = signupData.email.split('@')[0];
    if (signupData.username.toLowerCase() === emailNamePart.toLowerCase()) {
      setError("Username should not match the name part of your email");
      setIsLoading(false);
      return;
    }
  
    if (!otpVerified) {
      setError("Please verify your email first");
      setIsLoading(false);
      return;
    }
    
    try {
      // Create the user
      const response = await axios.post(`${API_BASE_URL}/signup`, {
        username: signupData.username,
        email: signupData.email,
        password: signupData.password,
        confirmPassword: signupData.confirmPassword
      });
      
      // Check for successful signup
      if (response.data && response.data.message === "User created successfully. You can now login.") {
        // Clear form and show success
        resetAllForms();
        alert("Signup successful! Please login with your credentials.");
      } else {
        throw new Error(response.data?.detail || "Signup failed");
      }
    } catch (error) {
      console.error("Signup error:", error);
      
      // Detailed error handling
      if (error.response) {
        if (error.response.status === 422) {
          const validationErrors = error.response.data.detail;
          if (Array.isArray(validationErrors)) {
            const errorMessages = validationErrors.map(err => {
              const field = err.loc[err.loc.length - 1];
              return `${field}: ${err.msg}`;
            }).join(', ');
            setError(`Validation error: ${errorMessages}`);
          } else {
            setError(`Validation error: ${JSON.stringify(error.response.data.detail)}`);
          }
        } else {
          setError(error.response.data.detail || "Signup failed. Please try again.");
        }
      } else {
        setError(error.message || "Signup failed. Network error. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const submitAdminRequest = async (e) => {
    if (e) e.preventDefault();
    
    if (!requestData.email || !requestData.message || !requestData.password || 
      !requestData.confirmPassword || !requestData.full_name || !requestData.phone) {
      setError("All fields are required");
      return;
    }

    if (requestData.password !== requestData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!otpVerified) {
      setError("Please verify your email first");
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      
      const response = await axios.post(`${API_BASE_URL}/request-admin-access`, {
        email: requestData.email,
        message: requestData.message,
        full_name: requestData.full_name,
        phone: requestData.phone,
        password: requestData.password
      });

      if (response.data.message && response.data.message.includes("successfully")) {
        alert("Admin request submitted successfully!");
        resetAllForms();
      } else {
        throw new Error("Failed to submit request");
      }
    } catch (error) {
      console.error("Admin request error:", error);
      setError(error.response?.data?.detail || "Failed to submit request");
    } finally {
      setIsLoading(false);
    }
  };

  const containerStyle = {
    padding: 0,
    margin: 0,
    backgroundColor: '#f0f9ff',
    minHeight: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const cardStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '2.5rem',
    width: '100%',
    maxWidth: '450px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
    border: '1px solid #e0e0e0'
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    marginBottom: '1.5rem'
  };

  const logoStyle = {
    color: '#0284c7',
    fontWeight: 'bold',
    fontSize: '1.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  };

  const titleStyle = {
    margin: '0 0 1.5rem 0',
    fontSize: '1.5rem',
    color: '#0f172a',
    fontWeight: '600',
    textAlign: 'center'
  };

  // Shared input styling
  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    marginBottom: '1rem',
    fontSize: '0.9375rem',
    transition: 'border-color 0.2s',
    ':focus': {
      outline: 'none',
      borderColor: '#0284c7',
      boxShadow: '0 0 0 3px rgba(2, 132, 199, 0.1)'
    }
  };

  // Shared button styling
  const buttonStyle = (color = '#0284c7', disabled = false) => ({
    width: '100%',
    padding: '0.75rem',
    backgroundColor: disabled ? '#cbd5e1' : color,
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    marginBottom: '1rem',
    fontWeight: '500',
    fontSize: '0.9375rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: disabled ? '#cbd5e1' : '#0369a1'
    }
  });

  const linkStyle = {
    color: '#0284c7',
    textDecoration: 'none',
    fontWeight: '500',
    ':hover': {
      textDecoration: 'underline'
    }
  };

  const errorStyle = {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '0.75rem',
    borderRadius: '8px',
    marginBottom: '1rem',
    textAlign: 'center',
    fontSize: '0.875rem'
  };

  const successStyle = {
    backgroundColor: '#dcfce7',
    color: '#16a34a',
    padding: '0.75rem',
    borderRadius: '8px',
    marginBottom: '1rem',
    textAlign: 'center',
    fontSize: '0.875rem'
  };

  const toggleStyle = {
    textAlign: 'center',
    marginTop: '1rem',
    color: '#64748b',
    fontSize: '0.875rem'
  };

  // Render LoginForm
  const renderLoginForm = () => (
    <form onSubmit={handleLogin}>
      <div style={headerStyle}>
        <div style={logoStyle}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
          </svg>
          Rise above with every answer
        </div>
      </div>

      <h2 style={titleStyle}>Welcome back</h2>

      {error && <div style={errorStyle}>{error}</div>}

      <div>
        <label htmlFor="login-email" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#334155' }}>Email</label>
        <input
          id="login-email"
          type="email"
          name="email"
          autoComplete="email"
          value={loginData.email}
          onChange={handleLoginChange}
          required
          style={inputStyle}
          placeholder="Enter your email"
        />
      </div>

      <div>
        <label htmlFor="login-password" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#334155' }}>Password</label>
        <input
          id="login-password"
          type="password"
          name="password"
          autoComplete="current-password"
          value={loginData.password}
          onChange={handleLoginChange}
          required
          style={inputStyle}
          placeholder="Enter your password"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        style={buttonStyle('#0284c7', isLoading)}
      >
        {isLoading ? (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
            </svg>
            Logging in...
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
              <polyline points="10 17 15 12 10 7"></polyline>
              <line x1="15" y1="12" x2="3" y2="12"></line>
            </svg>
            Login
          </>
        )}
      </button>

      <div style={toggleStyle}>
        Don't have an account?{' '}
        <Link 
          to="#" 
          onClick={() => {
            setIsLogin(false);
            setError("");
            setShowAdminRequest(false);
          }}
          style={linkStyle}
        >
          Sign up
        </Link>
      </div>
    </form>
  );


  // Render SignupForm
  const renderSignupForm = () => (
    <form onSubmit={handleSignup}>
      <div style={headerStyle}>
        <div style={logoStyle}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
          </svg>
          Interview Practice
        </div>
      </div>

      <h2 style={titleStyle}>Create your account</h2>

      {error && <div style={errorStyle}>{error}</div>}

      <div>
        <label htmlFor="username" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#334155' }}>Username (letters only)</label>
        <input
          id="username"
          type="text"
          name="username"
          value={signupData.username}
          onChange={(e) => {
            const value = e.target.value;
            if (/^[a-zA-Z]*$/.test(value)) {
              handleSignupChange(e);
            }
          }}
          required
          pattern="[a-zA-Z]+"
          title="Only alphabets are allowed"
          minLength="3"
          style={inputStyle}
          placeholder="Enter your username"
        />
      </div>

      <div>
        <label htmlFor="signup-email" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#334155' }}>Email</label>
        <input
          id="signup-email"
          type="email"
          name="email"
          autoComplete="email"
          value={signupData.email}
          onChange={handleSignupChange}
          required
          disabled={otpSent}
          style={inputStyle}
          placeholder="Enter your email"
        />
      </div>

      {!otpSent ? (
        <button
          type="button"
          onClick={() => sendOtp("signup")}
          disabled={isLoading || !signupData.email}
          style={buttonStyle('#0284c7', isLoading || !signupData.email)}
        >
          {isLoading ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
              </svg>
              Sending...
            </>
          ) : (
            "Send Verification OTP"
          )}
        </button>
      ) : !otpVerified ? (
        <>
          <div>
            <label htmlFor="otp" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#334155' }}>Verification OTP (Check Spam Folder)</label>
            <input
              id="otp"
              type="text"
              name="otp"
              value={signupData.otp}
              onChange={handleSignupChange}
              required
              style={inputStyle}
              placeholder="Enter OTP"
            />
          </div>

          <button
            type="button"
            onClick={() => verifyOtp("signup")}
            disabled={isLoading || !signupData.otp}
            style={buttonStyle('#0284c7', isLoading || !signupData.otp)}
          >
            {isLoading ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                </svg>
                Verifying...
              </>
            ) : (
              "Verify OTP"
            )}
          </button>
        </>
      ) : (
        <>
          <div style={successStyle}>
            <p style={{ margin: 0 }}>Email verified successfully!</p>
          </div>

          <div>
            <label htmlFor="password" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#334155' }}>Password (min 6 characters)</label>
            <input
              id="password"
              type="password"
              name="password"
              autoComplete="new-password"
              value={signupData.password}
              onChange={handleSignupChange}
              required
              minLength="6"
              style={inputStyle}
              placeholder="Enter password"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#334155' }}>Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              value={signupData.confirmPassword}
              onChange={handleSignupChange}
              required
              minLength="6"
              style={inputStyle}
              placeholder="Confirm password"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={buttonStyle('#0284c7', isLoading)}
          >
            {isLoading ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                </svg>
                Signing up...
              </>
            ) : (
              "Sign Up"
            )}
          </button>
        </>
      )}

      <div style={{ ...toggleStyle, display: 'flex', justifyContent: 'space-between' }}>
        <Link 
          to="#" 
          onClick={() => {
            setIsLogin(true);
            setError("");
          }}
          style={linkStyle}
        >
          Back to Login
        </Link>
        
        <Link 
          to="#" 
          onClick={() => {
            setShowAdminRequest(true);
            setOtpSent(false);
            setOtpVerified(false);
            setError("");
          }}
          style={linkStyle}
        >
          Request Admin Access
        </Link>
      </div>
    </form>
  );


  // Render AdminRequestForm
  const renderAdminRequestForm = () => (
    <form onSubmit={submitAdminRequest}>
      <div style={headerStyle}>
        <div style={logoStyle}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
          </svg>
          Interview Practice
        </div>
      </div>

      <h2 style={titleStyle}>Request Admin Access</h2>

      {error && <div style={errorStyle}>{error}</div>}

      <div>
        <label htmlFor="admin-email" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#334155' }}>Email</label>
        <input
          id="admin-email"
          type="email"
          name="email"
          value={requestData.email}
          onChange={handleRequestChange}
          required
          disabled={otpSent}
          style={inputStyle}
          placeholder="Enter your email"
        />
      </div>

      {!otpSent ? (
        <button
          type="button"
          onClick={() => sendOtp("admin")}
          disabled={isLoading || !requestData.email}
          style={buttonStyle('#0284c7', isLoading || !requestData.email)}
        >
          {isLoading ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
              </svg>
              Sending...
            </>
          ) : (
            "Send Verification OTP"
          )}
        </button>
      ) : !otpVerified ? (
        <>
          <div>
            <label htmlFor="admin-otp" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#334155' }}>Verification OTP</label>
            <input
              id="admin-otp"
              type="text"
              name="otp"
              value={requestData.otp}
              onChange={handleRequestChange}
              required
              style={inputStyle}
              placeholder="Enter OTP"
            />
          </div>

          <button
            type="button"
            onClick={() => verifyOtp("admin")}
            disabled={isLoading || !requestData.otp}
            style={buttonStyle('#0284c7', isLoading || !requestData.otp)}
          >
            {isLoading ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                </svg>
                Verifying...
              </>
            ) : (
              "Verify OTP"
            )}
          </button>
        </>
      ) : (
        <>
          <div style={successStyle}>
            <p style={{ margin: 0 }}>Email verified successfully!</p>
          </div>
          
          <div>
            <label htmlFor="admin-fullname" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#334155' }}>Full Name</label>
            <input
              id="admin-fullname"
              type="text"
              name="full_name"
              value={requestData.full_name}
              onChange={handleRequestChange}
              required
              style={inputStyle}
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label htmlFor="admin-phone" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#334155' }}>Phone Number</label>
            <input
              id="admin-phone"
              type="tel"
              name="phone"
              value={requestData.phone}
              onChange={handleRequestChange}
              required
              style={inputStyle}
              placeholder="Enter your phone number"
            />
          </div>

          <div>
            <label htmlFor="admin-message" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#334155' }}>Why do you need admin access?</label>
            <textarea
              id="admin-message"
              name="message"
              value={requestData.message}
              onChange={handleRequestChange}
              style={{
                ...inputStyle,
                minHeight: '100px'
              }}
              required
              placeholder="Explain why you need admin privileges"
            />
          </div>

          <div>
            <label htmlFor="admin-password" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#334155' }}>Password</label>
            <input
              id="admin-password"
              type="password"
              name="password"
              value={requestData.password}
              onChange={handleRequestChange}
              required
              minLength="6"
              style={inputStyle}
              placeholder="Enter password"
            />
          </div>

          <div>
            <label htmlFor="admin-confirm-password" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#334155' }}>Confirm Password</label>
            <input
              id="admin-confirm-password"
              type="password"
              name="confirmPassword"
              value={requestData.confirmPassword}
              onChange={handleRequestChange}
              required
              style={inputStyle}
              placeholder="Confirm password"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={buttonStyle('#0284c7', isLoading)}
          >
            {isLoading ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                </svg>
                Submitting...
              </>
            ) : (
              "Submit Request"
            )}
          </button>
        </>
      )}

      <div style={toggleStyle}>
        <Link 
          to="#" 
          onClick={() => {
            setShowAdminRequest(false);
            setOtpSent(false);
            setOtpVerified(false);
            setError("");
          }}
          style={linkStyle}
        >
          Back to Signup
        </Link>
      </div>
    </form>
  );

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {isLogin ? renderLoginForm() : (showAdminRequest ? renderAdminRequestForm() : renderSignupForm())}
      </div>
    </div>
  );
}

export default Login;