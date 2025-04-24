import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const DEFAULT_ADMIN_EMAIL = import.meta.env.VITE_DEFAULT_ADMIN_EMAIL;
  
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const [timeLimit, setTimeLimit] = useState(60); // Default 60 seconds
  const [adminUsers, setAdminUsers] = useState([]);
  const [domains, setDomains] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [adminRequests, setAdminRequests] = useState([]);
  const [responses, setResponses] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [userFilter, setUserFilter] = useState("");
  const [domainFilter, setDomainFilter] = useState("");
  const [filteredResponses, setFilteredResponses] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [users, setUsers] = useState([]);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  // In AdminDashboard.jsx, add to the useState declarations:
  const [adminPosts, setAdminPosts] = useState([]);
  const [bulkQuestions, setBulkQuestions] = useState('');
  const [file, setFile] = useState(null);
  // Form states
  const [newDomain, setNewDomain] = useState("");
  const [newQuestion, setNewQuestion] = useState("");
  const [selectedDomainId, setSelectedDomainId] = useState("");
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [isDefaultAdmin, setIsDefaultAdmin] = useState(false);
  
  const navigate = useNavigate();

  // Add this to your AdminDashboard component
useEffect(() => {
  console.log("Auth check:", {
    token: localStorage.getItem("access_token"),
    role: localStorage.getItem("role"),
    email: localStorage.getItem("email"),
    expiresAt: localStorage.getItem("expires_at")
  });
}, []);


  // In AdminDashboard.jsx
useEffect(() => {
  const checkAuthAndFetchData = async () => {
    const token = localStorage.getItem("access_token");
    const role = localStorage.getItem("role");
    const expiresAt = localStorage.getItem("expires_at");
    
    if (!token || (expiresAt && new Date(expiresAt) < new Date()) || role !== "admin") {
      // Clear auth data and redirect
      localStorage.removeItem("access_token");
      localStorage.removeItem("role");
      localStorage.removeItem("email");
      localStorage.removeItem("expires_at");
      navigate("/login", { replace: true });
      return;
    }
    
    // If authentication is valid, fetch data
    fetchData();
  };
  
  checkAuthAndFetchData();
}, [navigate]);
  
  
  useEffect(() => {
    const currentUserEmail = localStorage.getItem("email");
    const isDefault = currentUserEmail === DEFAULT_ADMIN_EMAIL;
    console.log("Is default admin:", isDefault);
    console.log("Current email:", currentUserEmail);
    console.log("DEFAULT_ADMIN_EMAIL:", DEFAULT_ADMIN_EMAIL);
    setIsDefaultAdmin(isDefault);
    fetchData();
  }, []);
  
  useEffect(() => {
    if (!API_BASE_URL) {
      console.error("API_BASE_URL is not defined!");
      setMessage({
        text: "Configuration error - please contact support",
        type: "error"
      });
    }
  }, []);


  const handlePdfUpload = async (e) => {
    e.preventDefault();
    if (!file || !selectedDomainId) {
      setMessage({ text: "Please select a domain and PDF file", type: "error" });
      return;
    }
  
    setUploadingPdf(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('domain_id', selectedDomainId);
  
    try {
      const response = await axios.post(
        `${API_BASE_URL}/admin/upload-questions-pdf`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${localStorage.getItem("access_token")}`
          }
        }
      );
  
      // Update questions state with new questions
      setQuestions(prevQuestions => [...prevQuestions, ...response.data.questions]);
  
      // Create success message
      setMessage({ 
        text: `Successfully added ${response.data.questions.length} questions to ${response.data.domain_name}`, 
        type: "success" 
      });
  
      // Clear the file input
      setFile(null);
      
      // Refresh all data to ensure everything is up to date
      await fetchData();
      
    } catch (error) {
      setMessage({
        text: error.response?.data?.detail || "Failed to upload PDF",
        type: "error"
      });
    } finally {
      setUploadingPdf(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProfileMenu && !event.target.closest('.profile-menu-container')) {
        setShowProfileMenu(false);
      }
    };
  
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileMenu]);

  useEffect(() => {
    let result = responses;
    
    // Filter by user
    if (userFilter) {
        result = result.filter(response => 
            response.user_id.toLowerCase().includes(userFilter.toLowerCase())
        );
    }
    
    // Filter by domain
    if (domainFilter) {
        result = result.filter(response => {
            const question = questions.find(q => q.id === response.question_id);
            return question && question.domain_id === domainFilter;
        });
    }
    
    setFilteredResponses(result);
  }, [responses, userFilter, domainFilter, questions]);

  useEffect(() => {
    let result = users;
  
    // Filter non-admin users and exclude those with pending admin requests
    result = result.filter(user => 
      user.role !== "admin" && !user.admin_request_pending
    );
  
    // Apply user search filter
    if (userFilter) {
      result = result.filter(user => 
        user.email.toLowerCase().includes(userFilter.toLowerCase()) || 
        (user.username && user.username.toLowerCase().includes(userFilter.toLowerCase()))
      );
    }
  
    setFilteredUsers(result);
  }, [users, userFilter]);
  

  useEffect(() => {
    const currentUserEmail = localStorage.getItem("email");
    setIsDefaultAdmin(currentUserEmail === DEFAULT_ADMIN_EMAIL);
    fetchData();
  }, []);

  const tableHeaderStyle = {
    padding: '1rem 1.5rem',
    textAlign: 'left',
    fontWeight: '500',
    color: '#64748b',
    fontSize: '0.875rem'
  };
  
  const tableCellStyle = {
    padding: '1rem 1.5rem',
    verticalAlign: 'top'
  };

  // Inside fetchData function, update the admin users fetch:
  // Modify the fetchData function
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        navigate("/login");
        return;
      }
      
      const config = {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };
  
      // Fetch all base data
      const [
        domainsResponse, 
        questionsResponse, 
        responsesResponse,
        usersResponse,
        adminPostsResponse
      ] = await Promise.all([
        axios.get(`${API_BASE_URL}/admin/domains`, config),
        axios.get(`${API_BASE_URL}/admin/questions`, config),
        axios.get(`${API_BASE_URL}/admin/responses`, config),
        axios.get(`${API_BASE_URL}/admin/all-users`, config),
        axios.get(`${API_BASE_URL}/admin/posts`, config)
      ]);
  
      // Update states for base data
      setDomains(domainsResponse.data);
      setQuestions(questionsResponse.data);
      setResponses(responsesResponse.data);
      setUsers(usersResponse.data.filter(user => user.role !== "admin")); 
      setAdminPosts(adminPostsResponse.data);
  
      // Fetch admin users and requests separately for default admin
      const currentUserEmail = localStorage.getItem("email");
      if (currentUserEmail === DEFAULT_ADMIN_EMAIL) {
        try {
          const [adminUsersResponse, adminRequestsResponse] = await Promise.all([
            axios.get(`${API_BASE_URL}/admin/admin-users`, config),
            axios.get(`${API_BASE_URL}/admin/requests`, config)
          ]);
          
          setAdminUsers(adminUsersResponse.data);
          setAdminRequests(adminRequestsResponse.data);
        } catch (error) {
          console.error("Error fetching admin data:", error);
          setMessage({
            text: "Failed to fetch admin data",
            type: "error"
          });
        }
      }
  
    } catch (error) {
      console.error("Error in fetchData:", error);
      let errorMessage = "Failed to fetch data";
      if (error.response?.status === 401) {
        localStorage.removeItem("access_token");
        navigate("/login");
        return;
      }
      setMessage({
        text: error.response?.data?.detail || errorMessage,
        type: "error"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
// Add useEffect for checking default admin status
useEffect(() => {
  const currentUserEmail = localStorage.getItem("email");
  console.log("Current email:", currentUserEmail);
  console.log("DEFAULT_ADMIN_EMAIL:", DEFAULT_ADMIN_EMAIL);
  const isDefault = currentUserEmail === DEFAULT_ADMIN_EMAIL;
  console.log("Is default admin:", isDefault);
  setIsDefaultAdmin(isDefault);
  fetchData();
}, []);  
  
  const handleDeleteResponse = async (responseId) => {
    if (!window.confirm("Are you sure you want to delete this response?")) {
      return;
    }
    
    setIsLoading(true);
    try {
      await axios.delete(
        `${API_BASE_URL}/admin/responses/${responseId}`,
        { 
          headers: { 
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      setResponses(responses.filter(r => r.id !== responseId));
      setMessage({ text: "Response deleted successfully!", type: "success" });
    } catch (error) {
      console.error("Error deleting response:", error);
      setMessage({
        text: error.response?.data?.detail || "Failed to delete response",
        type: "error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post?")) {
      return;
    }
    
    setIsLoading(true);
    try {
      await axios.delete(
        `${API_BASE_URL}/admin/posts/${postId}`,
        { 
          headers: { 
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      setAdminPosts(adminPosts.filter(post => post.id !== postId));
      setMessage({ text: "Post deleted successfully!", type: "success" });
    } catch (error) {
      console.error("Error deleting post:", error);
      setMessage({
        text: error.response?.data?.detail || "Failed to delete post",
        type: "error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDomain = async (e) => {
    e.preventDefault();
    if (!newDomain.trim()) return;
    
    setIsLoading(true);
    try {
      const currentUserEmail = localStorage.getItem("email");
      
      const response = await axios.post(
        `${API_BASE_URL}/admin/create-domain`,
        { 
          name: newDomain,
          admin_email: currentUserEmail 
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` } }
      );
      
      setDomains([...domains, response.data]);
      setNewDomain("");
      setMessage({ text: "Domain created successfully!", type: "success" });
    } catch (error) {
      console.error("Error creating domain:", error);
      setMessage({
        text: error.response?.data?.detail || "Failed to create domain",
        type: "error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update handleCreateQuestion function
const handleCreateQuestion = async (e) => {
  e.preventDefault();
  if (!newQuestion.trim() || !selectedDomainId) return;
  
  setIsLoading(true);
  try {
      const response = await axios.post(
          `${API_BASE_URL}/admin/add-question`,
          { 
              domain_id: selectedDomainId, 
              text: newQuestion,
              time_limit: timeLimit || 60,  // Include time_limit in request
              admin_email: localStorage.getItem("email")
          },
          { 
              headers: { 
                  Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                  'Content-Type': 'application/json'
              }
          }
      );
      
      setQuestions([...questions, response.data]);
      setNewQuestion("");
      setMessage({ text: "Question added successfully!", type: "success" });
      await fetchData(); // Refresh the data
  } catch (error) {
      console.error("Error adding question:", error);
      setMessage({
          text: error.response?.data?.detail || "Failed to add question",
          type: "error"
      });
  } finally {
      setIsLoading(false);
  }
};

// Update handleBulkAdd function
const handleBulkAdd = async () => {
  if (!selectedDomainId) {
      setMessage({ text: "Please select a domain", type: "error" });
      return;
  }

  if (!bulkQuestions.trim()) {
      setMessage({ text: "Please enter questions to add", type: "error" });
      return;
  }

  setIsLoading(true);
  try {
      const questionsArray = bulkQuestions
          .split('\n')
          .filter(q => q.trim())
          .map(q => ({
              domain_id: selectedDomainId,
              text: q.trim(),
              time_limit: timeLimit || 60  // Include time_limit for each question
          }));

      const response = await axios.post(
          `${API_BASE_URL}/admin/bulk-add-questions`,
          {
              questions: questionsArray,
              admin_email: localStorage.getItem("email")
          },
          {
              headers: {
                  Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                  'Content-Type': 'application/json'
              }
          }
      );

      setMessage({
          text: `Successfully added ${questionsArray.length} questions`,
          type: "success"
      });
      setBulkQuestions('');
      await fetchData(); // Refresh the questions list
  } catch (error) {
      setMessage({
          text: error.response?.data?.detail || "Failed to add questions",
          type: "error"
      });
  } finally {
      setIsLoading(false);
  }
};

  const handleDeleteDomain = async (domainId) => {
    if (!window.confirm("Are you sure you want to delete this domain? This will also delete all associated questions.")) {
      return;
    }
    
    setIsLoading(true);
    try {
      await axios.delete(
        `${API_BASE_URL}/admin/domains/${domainId}`,
        { 
          headers: { 
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      setDomains(domains.filter(domain => domain.id !== domainId));
      setQuestions(questions.filter(question => question.domain_id !== domainId));
      setMessage({ text: "Domain deleted successfully!", type: "success" });
    } catch (error) {
      console.error("Error deleting domain:", error);
      setMessage({
        text: error.response?.data?.detail || "Failed to delete domain",
        type: "error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm("Are you sure you want to delete this question?")) {
      return;
    }
    
    setIsLoading(true);
    try {
      await axios.delete(
        `${API_BASE_URL}/admin/questions/${questionId}`,
        { 
          headers: { 
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      setQuestions(questions.filter(question => question.id !== questionId));
      setMessage({ text: "Question deleted successfully!", type: "success" });
    } catch (error) {
      console.error("Error deleting question:", error);
      setMessage({
        text: error.response?.data?.detail || "Failed to delete question",
        type: "error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGrantAdminAccess = async (email) => {
    if (!window.confirm(`Are you sure you want to grant admin access to ${email}?`)) {
      return;
    }
  
    setIsLoading(true);
    try {
      const currentUserEmail = localStorage.getItem("email");
      const token = localStorage.getItem("access_token");
      
      // First grant admin access
      await axios.post(
        `${API_BASE_URL}/admin/grant-access`,
        { email },
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Then refresh the admin requests list
      const updatedRequests = await axios.get(
        `${API_BASE_URL}/admin/requests`,
        { 
          headers: { 
            Authorization: `Bearer ${token}` 
          }
        }
      );
      
      // Update the local state with filtered requests
      const filteredRequests = updatedRequests.data.filter(req => req.status === 'pending');
      setAdminRequests(filteredRequests);
      
      setMessage({ text: "Admin access granted successfully!", type: "success" });
    } catch (error) {
      console.error("Error granting admin access:", error);
      setMessage({
        text: error.response?.data?.detail || "Failed to grant admin access",
        type: "error"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("role");
    localStorage.removeItem("email");
    localStorage.removeItem("expires_at");
    window.location.href = "/login";
  };
  // Add this useEffect at the top of your component
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const expiresAt = localStorage.getItem("expires_at");
    
    if (!token || (expiresAt && new Date(expiresAt) < new Date())) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("role");
      localStorage.removeItem("email");
      localStorage.removeItem("expires_at");
      navigate("/login");
      return;
    }
  
    fetchData();
  }, []);
  
  const handleDeleteUser = async (email) => {
    if (!window.confirm(`Are you sure you want to delete the user with email ${email}?`)) {
      return;
    }
    
    setIsLoading(true);
    try {
      await axios.delete(
        `${API_BASE_URL}/admin/users/${email}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` } }
      );
      
      setUsers(users.filter(user => user.email !== email));
      setMessage({ text: "Deleted successfully!", type: "success" });
    } catch (error) {
      console.error("Error deleting user:", error);
      setMessage({
        text: error.response?.data?.detail || "Failed to delete user",
        type: "error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to find domain name by ID
  const getDomainNameById = (domainId) => {
    const domain = domains.find(d => d.id === domainId);
    return domain ? domain.name : "Unknown Domain";
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
  
  
  
  console.log("IST:", formatDate(new Date().toISOString()));


  
  // View domain details and questions
  const viewDomainDetails = (domain) => {
    setSelectedDomain(domain);
    setActiveTab("domainDetails");
  };

  // Get questions for a specific domain
  const getDomainQuestions = (domainId) => {
    return questions.filter(q => q.domain_id === domainId);
  };

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
          Interview Practice Admin
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ position: 'relative' }} className="profile-menu-container">
            <button 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: '#0284c7',
                color: 'white',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '1rem',
                fontWeight: 'bold',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {localStorage.getItem("email")?.charAt(0).toUpperCase() || "A"}
            </button>
            
            {showProfileMenu && (
              <div style={{
                position: 'absolute',
                right: 0,
                top: '100%',
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
                    backgroundColor: '#0284c7',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    fontSize: '1rem',
                    fontWeight: 'bold'
                  }}>
                    {localStorage.getItem("email")?.charAt(0).toUpperCase() || "A"}
                  </div>
                  <div>
                    <div style={{ 
                      fontWeight: '600',
                      fontSize: '0.95rem',
                      color: '#334155'
                    }}>
                      {localStorage.getItem("email") || "Admin"}
                    </div>
                    <div style={{ 
                      color: '#64748b',
                      fontSize: '0.8rem'
                    }}>
                      {localStorage.getItem("role") || "Admin"}
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
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        {/* Dashboard Header */}
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
            backgroundColor: '#0284c7',
            color: 'white',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: '1.5rem',
            fontWeight: 'bold',
            flexShrink: 0
          }}>
            {localStorage.getItem("email")?.charAt(0).toUpperCase() || "A"}
          </div>
          
          <div>
            <h2 style={{ 
              margin: '0 0 0.25rem 0',
              color: '#0f172a',
              fontSize: '1.5rem'
            }}>
              Admin Dashboard
            </h2>
            <p style={{ 
              margin: '0',
              color: '#64748b'
            }}>
              {isDefaultAdmin ? "Default Administrator" : "Administrator"}
            </p>
          </div>
        </div>

        {/* Message Display */}
        {message.text && (
          <div style={{ 
            padding: '1rem', 
            backgroundColor: message.type === 'error' ? '#fef2f2' : '#f0fdf4',
            color: message.type === 'error' ? '#b91c1c' : '#166534',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            border: `1px solid ${message.type === 'error' ? '#fee2e2' : '#dcfce7'}`,
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {message.type === 'error' ? (
                <><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></>
              ) : (
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              )}
            </svg>
            <div>{message.text}</div>
          </div>
        )}

        {/* Tabs Navigation */}
        <div style={{ 
          display: 'flex',
          borderBottom: '1px solid #e0e0e0',
          marginBottom: '1.5rem',
          overflowX: 'auto'
        }}>
          <TabButton 
            label="Overview" 
            active={activeTab === "dashboard"}
            onClick={() => setActiveTab("dashboard")}
          />
          <TabButton 
            label="Domains" 
            active={activeTab === "domains"}
            onClick={() => setActiveTab("domains")}
          />
          <TabButton 
            label="Questions" 
            active={activeTab === "questions"}
            onClick={() => setActiveTab("questions")}
          />
          <TabButton 
            label="User Responses" 
            active={activeTab === "responses"}
            onClick={() => setActiveTab("responses")}
          />
          {isDefaultAdmin && (
            <TabButton 
              label="Admins" 
              active={activeTab === "admins"}
              onClick={() => setActiveTab("admins")}
            />
          )}
          <TabButton 
            label="Posts" 
            active={activeTab === "adminPosts"}
            onClick={() => setActiveTab("adminPosts")}
          />
          {isDefaultAdmin && (
            <TabButton 
              label="Admin Requests" 
              active={activeTab === "adminRequests"}
              onClick={() => setActiveTab("adminRequests")}
            />
          )}
          <TabButton 
            label="Users" 
            active={activeTab === "users"}
            onClick={() => setActiveTab("users")}
          />
          {selectedDomain && (
            <TabButton 
              label={`Domain: ${selectedDomain.name}`}
              active={activeTab === "domainDetails"}
              onClick={() => setActiveTab("domainDetails")}
            />
          )}
        </div>
        
        {isLoading && (
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
            <div>Loading data...</div>
          </div>
        )}
        
        {/* Dashboard Overview */}
        {activeTab === "dashboard" && !isLoading && (
          <div>
            <h2 style={{ 
              marginTop: 0,
              marginBottom: '1.5rem',
              color: '#0f172a',
              fontSize: '1.5rem'
            }}>Dashboard Overview</h2>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1.5rem',
              marginBottom: '2rem'
            }}>
              <StatCard 
                title="Total Domains" 
                value={domains.length} 
                color="#0284c7"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                  </svg>
                }
              />
              <StatCard 
                title="Total Questions" 
                value={questions.length} 
                color="#059669"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                    <line x1="9" y1="9" x2="9.01" y2="9"></line>
                    <line x1="15" y1="9" x2="15.01" y2="9"></line>
                  </svg>
                }
              />
              <StatCard 
                title="User Responses" 
                value={responses.length} 
                color="#d97706"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                }
              />
              {isDefaultAdmin && (
                <StatCard 
                  title="Pending Admin Requests" 
                  value={adminRequests.length} 
                  color="#dc2626"
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                  }
                />
              )}
            </div>
            
            <div style={{ marginTop: '2rem' }}>
              <h3 style={{ 
                marginTop: 0,
                marginBottom: '1rem',
                color: '#0f172a',
                fontSize: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                </svg>
                Recent Admin Activity
              </h3>
              
              {adminPosts.length > 0 ? (
                <div style={{ 
                  border: '1px solid #e0e0e0', 
                  borderRadius: '12px',
                  overflow: 'hidden'
                }}>
                  {adminPosts.slice(0, 5).map(post => (
                    <div key={post.id} style={{ 
                      padding: '1.5rem',
                      borderBottom: '1px solid #e0e0e0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: '#ffffff'
                    }}>
                      <div>
                        <div style={{ 
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          marginBottom: '0.5rem'
                        }}>
                          <div style={{ 
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: '#0284c7',
                            color: 'white',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 'bold'
                          }}>
                            {post.admin_name?.charAt(0).toUpperCase() || "A"}
                          </div>
                          <strong>{post.admin_name}</strong>
                        </div>
                        <p style={{ margin: '0.5rem 0 0 0', color: '#475569' }}>
                          {post.content.includes('added questions to') ? 
                            `Added questions to ${post.content.split('to ')[1]}` :
                            post.content}
                        </p>
                      </div>
                      <span style={{ 
                        color: '#64748b',
                        fontSize: '0.875rem',
                        whiteSpace: 'nowrap'
                      }}>
                        {formatDate(post.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ 
                  padding: '2rem',
                  textAlign: 'center',
                  backgroundColor: '#f8fafc',
                  borderRadius: '12px',
                  border: '1px dashed #cbd5e1'
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4, marginBottom: '0.5rem' }}>
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <p style={{ margin: 0, color: '#64748b' }}>No recent activity to display.</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Other tabs content remains the same but with updated styling */}
        {/* Domains Tab */}
        {activeTab === "domains" && !isLoading && (
          <div>
            <h2 style={{ 
              marginTop: 0,
              marginBottom: '1.5rem',
              color: '#0f172a',
              fontSize: '1.5rem'
            }}>Manage Domains</h2>
            
            <div style={{ 
              backgroundColor: '#ffffff',
              borderRadius: '12px', 
              padding: '1.5rem',
              marginBottom: '2rem',
              border: '1px solid #e0e0e0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <h3 style={{ 
                marginTop: 0,
                marginBottom: '1rem',
                color: '#0f172a',
                fontSize: '1.25rem'
              }}>Create New Domain</h3>
              
              <form onSubmit={handleCreateDomain}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <input
                    type="text"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    placeholder="Enter domain name"
                    style={{ 
                      flex: 1, 
                      padding: '0.75rem', 
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '0.9375rem',
                      transition: 'border-color 0.2s',
                      ':focus': {
                        outline: 'none',
                        borderColor: '#0284c7',
                        boxShadow: '0 0 0 3px rgba(2, 132, 199, 0.1)'
                      }
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!newDomain.trim() || isLoading}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: !newDomain.trim() || isLoading ? '#cbd5e1' : '#0284c7',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: !newDomain.trim() || isLoading ? 'not-allowed' : 'pointer',
                      fontWeight: '500',
                      fontSize: '0.9375rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      transition: 'background-color 0.2s',
                      ':hover': {
                        backgroundColor: !newDomain.trim() || isLoading ? '#cbd5e1' : '#0369a1'
                      }
                    }}
                  >
                    {isLoading ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                          <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                        </svg>
                        Creating...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 5v14M5 12h14"></path>
                        </svg>
                        Create Domain
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
            
            <h3 style={{ 
              marginTop: 0,
              marginBottom: '1rem',
              color: '#0f172a',
              fontSize: '1.25rem'
            }}>Existing Domains</h3>
            
            {domains.length > 0 ? (
              <div style={{ 
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e0e0e0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: '1px',
                  backgroundColor: '#e2e8f0'
                }}>
                  {domains.map((domain) => (
                    <div key={domain.id} style={{ 
                      backgroundColor: '#ffffff',
                      padding: '1.25rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ 
                          fontWeight: '600',
                          color: '#0f172a',
                          marginBottom: '0.25rem'
                        }}>
                          {domain.name}
                        </div>
                        <div style={{ 
                          color: '#64748b',
                          fontSize: '0.875rem'
                        }}>
                          {questions.filter(q => q.domain_id === domain.id).length} questions • Created {formatDate(domain.created_at)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => viewDomainDetails(domain)}
                          style={{
                            padding: '0.5rem 0.75rem',
                            backgroundColor: '#0284c7',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.875rem'
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                          View
                        </button>
                        <button
                          onClick={() => handleDeleteDomain(domain.id)}
                          style={{
                            padding: '0.5rem 0.75rem',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.875rem'
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ 
                padding: '2rem',
                textAlign: 'center',
                backgroundColor: '#f8fafc',
                borderRadius: '12px',
                border: '1px dashed #cbd5e1'
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4, marginBottom: '0.5rem' }}>
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                  <line x1="3.27" y1="6.96" x2="12" y2="12.01"></line>
                  <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
                <p style={{ margin: 0, color: '#64748b' }}>No domains available. Create a domain to get started.</p>
              </div>
            )}
          </div>
        )}
        {/* Domain Details Tab */}
{activeTab === "domainDetails" && selectedDomain && !isLoading && (
  <div>
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      marginBottom: '1.5rem'
    }}>
      <h2 style={{ 
        margin: 0,
        color: '#0f172a',
        fontSize: '1.5rem'
      }}>Domain: {selectedDomain.name}</h2>
      <button
        onClick={() => setActiveTab("domains")}
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#64748b',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.875rem'
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        Back to Domains
      </button>
    </div>
    
    <div style={{ 
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      padding: '1.5rem',
      marginBottom: '2rem',
      border: '1px solid #e0e0e0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
    }}>
      <h3 style={{ 
        marginTop: 0,
        marginBottom: '1rem',
        color: '#0f172a',
        fontSize: '1.25rem'
      }}>Domain Information</h3>
      
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '1rem'
      }}>
        <div>
          <div style={{ 
            color: '#64748b',
            fontSize: '0.875rem',
            marginBottom: '0.25rem'
          }}>Domain ID</div>
          <div style={{ fontWeight: '500' }}>{selectedDomain.id}</div>
        </div>
        <div>
          <div style={{ 
            color: '#64748b',
            fontSize: '0.875rem',
            marginBottom: '0.25rem'
          }}>Created At</div>
          <div style={{ fontWeight: '500' }}>{formatDate(selectedDomain.created_at)}</div>
        </div>
        <div>
          <div style={{ 
            color: '#64748b',
            fontSize: '0.875rem',
            marginBottom: '0.25rem'
          }}>Total Questions</div>
          <div style={{ fontWeight: '500' }}>{getDomainQuestions(selectedDomain.id).length}</div>
        </div>
      </div>
    </div>
    
    <div style={{ 
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      padding: '1.5rem',
      marginBottom: '2rem',
      border: '1px solid #e0e0e0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
    }}>
      <h3 style={{ 
        marginTop: 0,
        marginBottom: '1rem',
        color: '#0f172a',
        fontSize: '1.25rem'
      }}>Add New Question</h3>
      
      <form onSubmit={(e) => {
        e.preventDefault();
        setSelectedDomainId(selectedDomain.id);
        handleCreateQuestion(e);
      }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ 
            display: 'block',
            marginBottom: '0.5rem',
            color: '#334155',
            fontWeight: '500'
          }}>Question Text</label>
          <textarea
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="Enter question text"
            style={{ 
              width: '100%', 
              padding: '0.75rem', 
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              minHeight: '120px',
              fontSize: '0.9375rem',
              transition: 'border-color 0.2s',
              ':focus': {
                outline: 'none',
                borderColor: '#0284c7',
                boxShadow: '0 0 0 3px rgba(2, 132, 199, 0.1)'
              }
            }}
          />
        </div>
        
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          <div>
            <label style={{ 
              display: 'block',
              marginBottom: '0.5rem',
              color: '#334155',
              fontWeight: '500'
            }}>Time Limit (seconds)</label>
            <input
              type="number"
              value={timeLimit}
              onChange={(e) => setTimeLimit(e.target.value)}
              min="30"
              style={{ 
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '0.9375rem'
              }}
            />
          </div>
        </div>
        
        <button
          type="submit"
          disabled={!newQuestion.trim() || isLoading}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: !newQuestion.trim() || isLoading ? '#cbd5e1' : '#0284c7',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: !newQuestion.trim() || isLoading ? 'not-allowed' : 'pointer',
            fontWeight: '500',
            fontSize: '0.9375rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'background-color 0.2s',
            ':hover': {
              backgroundColor: !newQuestion.trim() || isLoading ? '#cbd5e1' : '#0369a1'
            }
          }}
        >
          {isLoading ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
              </svg>
              Adding...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14"></path>
              </svg>
              Add Question
            </>
          )}
        </button>
      </form>
    </div>
    
    <h3 style={{ 
      marginTop: 0,
      marginBottom: '1rem',
      color: '#0f172a',
      fontSize: '1.25rem'
    }}>Domain Questions</h3>
    
    {getDomainQuestions(selectedDomain.id).length > 0 ? (
      <div style={{ 
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e0e0e0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        overflow: 'hidden'
      }}>
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '1px',
          backgroundColor: '#e2e8f0'
        }}>
          {getDomainQuestions(selectedDomain.id).map((question) => (
            <div key={question.id} style={{ 
              backgroundColor: '#ffffff',
              padding: '1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ 
                  fontWeight: '500',
                  color: '#0f172a',
                  marginBottom: '0.25rem'
                }}>
                  {question.text}
                </div>
                <div style={{ 
                  color: '#64748b',
                  fontSize: '0.875rem'
                }}>
                  Time limit: {question.time_limit || 60} sec • Created {formatDate(question.created_at)}
                </div>
              </div>
              <button
                onClick={() => handleDeleteQuestion(question.id)}
                style={{
                  padding: '0.5rem 0.75rem',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.875rem'
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>
    ) : (
      <div style={{ 
        padding: '2rem',
        textAlign: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        border: '1px dashed #cbd5e1'
      }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4, marginBottom: '0.5rem' }}>
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
          <line x1="9" y1="9" x2="9.01" y2="9"></line>
          <line x1="15" y1="9" x2="15.01" y2="9"></line>
        </svg>
        <p style={{ margin: 0, color: '#64748b' }}>No questions available for this domain.</p>
      </div>
    )}
  </div>
)}

{/* Questions Tab */}
{activeTab === "questions" && !isLoading && (
  <div>
    <h2 style={{ 
      marginTop: 0,
      marginBottom: '1.5rem',
      color: '#0f172a',
      fontSize: '1.5rem'
    }}>Manage Questions</h2>
    
    <div style={{ 
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      padding: '1.5rem',
      marginBottom: '2rem',
      border: '1px solid #e0e0e0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
    }}>
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1.5rem',
        marginBottom: '1.5rem'
      }}>
        {/* Single Question Input */}
        <div style={{ 
          backgroundColor: '#f8fafc',
          borderRadius: '8px',
          padding: '1.25rem'
        }}>
          <h3 style={{ 
            marginTop: 0,
            marginBottom: '1rem',
            color: '#0f172a',
            fontSize: '1.125rem'
          }}>Add Single Question</h3>
          
          <textarea
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="Enter your question here..."
            style={{ 
              width: '100%',
              minHeight: '120px',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              marginBottom: '1rem',
              fontSize: '0.9375rem'
            }}
          />
          
          <button
            onClick={handleCreateQuestion}
            disabled={!newQuestion.trim() || !selectedDomainId || isLoading}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: !newQuestion.trim() || !selectedDomainId || isLoading ? '#cbd5e1' : '#0284c7',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: !newQuestion.trim() || !selectedDomainId || isLoading ? 'not-allowed' : 'pointer',
              fontWeight: '500',
              fontSize: '0.9375rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            {isLoading ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                </svg>
                Adding...
              </>
            ) : (
              'Add Question'
            )}
          </button>
        </div>
        
        {/* Bulk Questions Input */}
        <div style={{ 
          backgroundColor: '#f8fafc',
          borderRadius: '8px',
          padding: '1.25rem'
        }}>
          <h3 style={{ 
            marginTop: 0,
            marginBottom: '1rem',
            color: '#0f172a',
            fontSize: '1.125rem'
          }}>Add Multiple Questions</h3>
          
          <textarea
            value={bulkQuestions}
            onChange={(e) => setBulkQuestions(e.target.value)}
            placeholder="Enter multiple questions (one per line)..."
            style={{ 
              width: '100%',
              minHeight: '120px',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              marginBottom: '1rem',
              fontSize: '0.9375rem'
            }}
          />
          
          <button
            onClick={handleBulkAdd}
            disabled={!bulkQuestions.trim() || !selectedDomainId || isLoading}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: !bulkQuestions.trim() || !selectedDomainId || isLoading ? '#cbd5e1' : '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: !bulkQuestions.trim() || !selectedDomainId || isLoading ? 'not-allowed' : 'pointer',
              fontWeight: '500',
              fontSize: '0.9375rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            {isLoading ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                </svg>
                Adding...
              </>
            ) : (
              'Add All Questions'
            )}
          </button>
        </div>
      </div>
      
      {/* Domain Selection */}
      <div style={{ 
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        padding: '1.25rem',
        marginBottom: '1.5rem'
      }}>
        <h3 style={{ 
          marginTop: 0,
          marginBottom: '1rem',
          color: '#0f172a',
          fontSize: '1.125rem'
        }}>Select Domain</h3>
        
        <select
          value={selectedDomainId}
          onChange={(e) => setSelectedDomainId(e.target.value)}
          style={{ 
            width: '100%',
            padding: '0.75rem',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            backgroundColor: 'white',
            fontSize: '0.9375rem'
          }}
        >
          <option value="">Select a Domain</option>
          {domains.map((domain) => (
            <option key={domain.id} value={domain.id}>
              {domain.name}
            </option>
          ))}
        </select>
      </div>
      
      {/* PDF Upload Section */}
      <div style={{ 
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        padding: '1.25rem'
      }}>
        <h3 style={{ 
          marginTop: 0,
          marginBottom: '1rem',
          color: '#0f172a',
          fontSize: '1.125rem'
        }}>Upload Questions from PDF</h3>
        
        <form onSubmit={handlePdfUpload}>
          <div style={{ marginBottom: '1rem' }}>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setFile(e.target.files[0])}
              style={{ 
                width: '100%',
                padding: '0.5rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                backgroundColor: 'white'
              }}
            />
          </div>
          
          <button
            type="submit"
            disabled={!file || !selectedDomainId || uploadingPdf}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: !file || !selectedDomainId || uploadingPdf ? '#cbd5e1' : '#7c3aed',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: !file || !selectedDomainId || uploadingPdf ? 'not-allowed' : 'pointer',
              fontWeight: '500',
              fontSize: '0.9375rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            {uploadingPdf ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                </svg>
                Uploading...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                Upload PDF
              </>
            )}
          </button>
        </form>
      </div>
    </div>
    
    {/* Time Limit Setting */}
    <div style={{ 
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      padding: '1.5rem',
      marginBottom: '2rem',
      border: '1px solid #e0e0e0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
    }}>
      <h3 style={{ 
        marginTop: 0,
        marginBottom: '1rem',
        color: '#0f172a',
        fontSize: '1.125rem'
      }}>Default Time Limit</h3>
      
      <div style={{ 
        display: 'flex',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <input
          type="number"
          value={timeLimit}
          onChange={(e) => setTimeLimit(e.target.value)}
          min="30"
          style={{ 
            width: '100px',
            padding: '0.75rem',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            fontSize: '0.9375rem'
          }}
        />
        <span style={{ color: '#64748b' }}>seconds</span>
      </div>
    </div>
    
    {/* Existing Questions List */}
    <div style={{ 
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      border: '1px solid #e0e0e0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      overflow: 'hidden'
    }}>
      <div style={{ 
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f8fafc'
      }}>
        <h3 style={{ 
          margin: 0,
          color: '#0f172a',
          fontSize: '1.125rem'
        }}>Existing Questions</h3>
        <span style={{ 
          color: '#64748b',
          fontSize: '0.875rem'
        }}>{questions.length} questions total</span>
      </div>
      
      {questions.length > 0 ? (
        <div style={{ maxHeight: '500px', overflow: 'auto' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            fontSize: '0.9375rem'
          }}>
            <thead style={{ 
              position: 'sticky', 
              top: 0, 
              backgroundColor: 'white',
              boxShadow: '0 1px 0 #e2e8f0'
            }}>
              <tr>
                <th style={{ 
                  ...tableHeaderStyle, 
                  width: '50%',
                  padding: '1rem 1.5rem',
                  textAlign: 'left',
                  fontWeight: '500',
                  color: '#64748b',
                  fontSize: '0.875rem'
                }}>Question</th>
                <th style={{ 
                  ...tableHeaderStyle,
                  padding: '1rem 1.5rem',
                  textAlign: 'left',
                  fontWeight: '500',
                  color: '#64748b',
                  fontSize: '0.875rem'
                }}>Domain</th>
                <th style={{ 
                  ...tableHeaderStyle,
                  padding: '1rem 1.5rem',
                  textAlign: 'left',
                  fontWeight: '500',
                  color: '#64748b',
                  fontSize: '0.875rem'
                }}>Time Limit</th>
                <th style={{ 
                  ...tableHeaderStyle,
                  padding: '1rem 1.5rem',
                  textAlign: 'left',
                  fontWeight: '500',
                  color: '#64748b',
                  fontSize: '0.875rem'
                }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((question) => (
                <tr key={question.id} style={{ 
                  borderTop: '1px solid #f1f5f9',
                  ':hover': {
                    backgroundColor: '#f8fafc'
                  }
                }}>
                  <td style={{ 
                    ...tableCellStyle,
                    padding: '1rem 1.5rem',
                    color: '#0f172a'
                  }}>{question.text}</td>
                  <td style={{ 
                    ...tableCellStyle,
                    padding: '1rem 1.5rem',
                    color: '#475569'
                  }}>{getDomainNameById(question.domain_id)}</td>
                  <td style={{ 
                    ...tableCellStyle,
                    padding: '1rem 1.5rem',
                    color: '#475569'
                  }}>{question.time_limit || 60} sec</td>
                  <td style={{ 
                    ...tableCellStyle,
                    padding: '1rem 1.5rem'
                  }}>
                    <button
                      onClick={() => handleDeleteQuestion(question.id)}
                      style={{
                        padding: '0.5rem 0.75rem',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontSize: '0.875rem'
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ 
          padding: '2rem',
          textAlign: 'center',
          color: '#64748b'
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4, marginBottom: '0.5rem' }}>
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
            <line x1="9" y1="9" x2="9.01" y2="9"></line>
            <line x1="15" y1="9" x2="15.01" y2="9"></line>
          </svg>
          <p style={{ margin: 0 }}>No questions available. Add your first question above.</p>
        </div>
      )}
    </div>
  </div>
)}

{/* Posts Tab */}
{activeTab === "adminPosts" && !isLoading && (
  <div>
    <h2 style={{ 
      marginTop: 0,
      marginBottom: '1.5rem',
      color: '#0f172a',
      fontSize: '1.5rem'
    }}>Admin Posts</h2>
    
    <div style={{ 
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      padding: '1.5rem',
      marginBottom: '2rem',
      border: '1px solid #e0e0e0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
    }}>
      <h3 style={{ 
        marginTop: 0,
        marginBottom: '1rem',
        color: '#0f172a',
        fontSize: '1.25rem'
      }}>Create New Post</h3>
      
      <form onSubmit={async (e) => {
        e.preventDefault();
        const content = e.target.content.value;
        if (!content.trim()) return;
        
        try {
          const response = await axios.post(
            `${API_BASE_URL}/admin/create-post`,
            { content },
            { headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` } }
          );
          setMessage({ text: "Post created successfully!", type: "success" });
          e.target.content.value = "";
          fetchData();
        } catch (error) {
          setMessage({
            text: error.response?.data?.detail || "Failed to create post",
            type: "error"
          });
        }
      }}>
        <textarea
          name="content"
          placeholder="Write your update here..."
          style={{ 
            width: '100%', 
            padding: '0.75rem', 
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            minHeight: '120px',
            marginBottom: '1rem',
            fontSize: '0.9375rem'
          }}
          required
        />
        
        <button
          type="submit"
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#0284c7',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '0.9375rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'background-color 0.2s',
            ':hover': {
              backgroundColor: '#0369a1'
            }
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
          Post Update
        </button>
      </form>
    </div>
    
    <h3 style={{ 
      marginTop: 0,
      marginBottom: '1rem',
      color: '#0f172a',
      fontSize: '1.25rem'
    }}>Recent Posts</h3>
    
    {adminPosts.length > 0 ? (
      <div style={{ 
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e0e0e0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        overflow: 'hidden'
      }}>
        {adminPosts.map(post => (
          <div key={post.id} style={{ 
            padding: '1.5rem',
            borderBottom: '1px solid #f1f5f9',
            position: 'relative'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ 
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#0284c7',
                  color: 'white',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  fontSize: '0.875rem',
                  fontWeight: 'bold'
                }}>
                  {post.admin_name?.charAt(0).toUpperCase() || "A"}
                </div>
                <div>
                  <div style={{ fontWeight: '600' }}>{post.admin_name}</div>
                  <div style={{ 
                    color: '#64748b',
                    fontSize: '0.875rem'
                  }}>
                    {formatDate(post.created_at)}
                  </div>
                </div>
              </div>
              
              {isDefaultAdmin && (
                <button
                  onClick={() => handleDeletePost(post.id)}
                  style={{
                    padding: '0.25rem 0.5rem',
                    backgroundColor: '#fee2e2',
                    color: '#b91c1c',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                  Delete
                </button>
              )}
            </div>
            
            <div style={{ 
              color: '#334155',
              lineHeight: '1.6',
              paddingLeft: 'calc(40px + 0.75rem)'
            }}>
              {post.content.includes('added questions to') ? 
                `Added questions to ${post.content.split('to ')[1]}` :
                post.content}
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div style={{ 
        padding: '2rem',
        textAlign: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        border: '1px dashed #cbd5e1'
      }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4, marginBottom: '0.5rem' }}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
        <p style={{ margin: 0, color: '#64748b' }}>No posts yet.</p>
      </div>
    )}
  </div>
)}

{/* User Responses Tab */}
{activeTab === "responses" && !isLoading && (
  <div>
    <h2 style={{ 
      marginTop: 0,
      marginBottom: '1.5rem',
      color: '#0f172a',
      fontSize: '1.5rem'
    }}>User Responses</h2>
    
    {!selectedUserId ? (
      // Show users list
      <div style={{ 
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e0e0e0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        overflow: 'hidden'
      }}>
        <div style={{ 
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f8fafc'
        }}>
          <h3 style={{ 
            margin: 0,
            color: '#0f172a',
            fontSize: '1.125rem'
          }}>Users with Responses</h3>
          <span style={{ 
            color: '#64748b',
            fontSize: '0.875rem'
          }}>{[...new Set(responses.map(r => r.user_id))].length} users</span>
        </div>
        
        <div style={{ maxHeight: '500px', overflow: 'auto' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            fontSize: '0.9375rem'
          }}>
            <thead style={{ 
              position: 'sticky', 
              top: 0, 
              backgroundColor: 'white',
              boxShadow: '0 1px 0 #e2e8f0'
            }}>
              <tr>
                <th style={{ 
                  padding: '1rem 1.5rem',
                  textAlign: 'left',
                  fontWeight: '500',
                  color: '#64748b',
                  fontSize: '0.875rem'
                }}>User ID</th>
                <th style={{ 
                  padding: '1rem 1.5rem',
                  textAlign: 'left',
                  fontWeight: '500',
                  color: '#64748b',
                  fontSize: '0.875rem'
                }}>Response Count</th>
                <th style={{ 
                  padding: '1rem 1.5rem',
                  textAlign: 'left',
                  fontWeight: '500',
                  color: '#64748b',
                  fontSize: '0.875rem'
                }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {[...new Set(responses.map(r => r.user_id))].map(userId => {
                const userResponses = responses.filter(r => r.user_id === userId);
                return (
                  <tr key={userId} style={{ 
                    borderTop: '1px solid #f1f5f9',
                    ':hover': {
                      backgroundColor: '#f8fafc'
                    }
                  }}>
                    <td style={{ 
                      padding: '1rem 1.5rem',
                      color: '#0f172a'
                    }}>{userId}</td>
                    <td style={{ 
                      padding: '1rem 1.5rem',
                      color: '#475569'
                    }}>{userResponses.length}</td>
                    <td style={{ 
                      padding: '1rem 1.5rem'
                    }}>
                      <button
                        onClick={() => setSelectedUserId(userId)}
                        style={{
                          padding: '0.5rem 0.75rem',
                          backgroundColor: '#0284c7',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          fontSize: '0.875rem'
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        View Responses
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    ) : (
      // Show responses for selected user
      <div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '1.5rem'
        }}>
          <h2 style={{ 
            margin: 0,
            color: '#0f172a',
            fontSize: '1.5rem'
          }}>Responses for User: {selectedUserId}</h2>
          <button
            onClick={() => setSelectedUserId(null)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#64748b',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem'
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Back to Users List
          </button>
        </div>

        {responses.filter(r => r.user_id === selectedUserId).length > 0 ? (
          <div style={{ 
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e0e0e0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            overflow: 'hidden'
          }}>
            <div style={{ maxHeight: '600px', overflow: 'auto' }}>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                fontSize: '0.9375rem'
              }}>
                <thead style={{ 
                  position: 'sticky', 
                  top: 0, 
                  backgroundColor: 'white',
                  boxShadow: '0 1px 0 #e2e8f0'
                }}>
                  <tr>
                    <th style={{ 
                      padding: '1rem 1.5rem',
                      textAlign: 'left',
                      fontWeight: '500',
                      color: '#64748b',
                      fontSize: '0.875rem'
                    }}>Question</th>
                    <th style={{ 
                      padding: '1rem 1.5rem',
                      textAlign: 'left',
                      fontWeight: '500',
                      color: '#64748b',
                      fontSize: '0.875rem'
                    }}>Response</th>
                    <th style={{ 
                      padding: '1rem 1.5rem',
                      textAlign: 'left',
                      fontWeight: '500',
                      color: '#64748b',
                      fontSize: '0.875rem'
                    }}>Domain</th>
                    <th style={{ 
                      padding: '1rem 1.5rem',
                      textAlign: 'left',
                      fontWeight: '500',
                      color: '#64748b',
                      fontSize: '0.875rem'
                    }}>Date</th>
                    <th style={{ 
                      padding: '1rem 1.5rem',
                      textAlign: 'left',
                      fontWeight: '500',
                      color: '#64748b',
                      fontSize: '0.875rem'
                    }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {responses
                    .filter(r => r.user_id === selectedUserId)
                    .map((response) => {
                      const question = questions.find(q => q.id === response.question_id);
                      const domain = question ? domains.find(d => d.id === question.domain_id) : null;
                      
                      return (
                        <tr key={response.id} style={{ 
                          borderTop: '1px solid #f1f5f9',
                          ':hover': {
                            backgroundColor: '#f8fafc'
                          }
                        }}>
                          <td style={{ 
                            padding: '1rem 1.5rem',
                            color: '#0f172a'
                          }}>
                            {question ? question.text : 'Question not found'}
                          </td>
                          <td style={{ 
                            padding: '1rem 1.5rem',
                            color: '#475569'
                          }}>
                            {response.user_response || 'No response'}
                          </td>
                          <td style={{ 
                            padding: '1rem 1.5rem',
                            color: '#475569'
                          }}>
                            {domain ? domain.name : 'Unknown domain'}
                          </td>
                          <td style={{ 
                            padding: '1rem 1.5rem',
                            color: '#475569'
                          }}>
                            {formatDate(response.created_at)}
                          </td>
                          <td style={{ 
                            padding: '1rem 1.5rem'
                          }}>
                            <button
                              onClick={() => handleDeleteResponse(response.id)}
                              style={{
                                padding: '0.5rem 0.75rem',
                                backgroundColor: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontSize: '0.875rem'
                              }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              </svg>
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div style={{ 
            padding: '2rem',
            textAlign: 'center',
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            border: '1px dashed #cbd5e1'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4, marginBottom: '0.5rem' }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <p style={{ margin: 0, color: '#64748b' }}>No responses found for this user.</p>
          </div>
        )}
      </div>
    )}
  </div>
)}

{/* Admin Requests Tab (only visible to default admin) */}
{activeTab === "adminRequests" && isDefaultAdmin && !isLoading && (
  <div>
    <h2 style={{ 
      marginTop: 0,
      marginBottom: '1.5rem',
      color: '#0f172a',
      fontSize: '1.5rem'
    }}>Admin Access Requests</h2>
    
    {adminRequests.length > 0 ? (
      <div style={{ 
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e0e0e0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        overflow: 'hidden'
      }}>
        <div style={{ maxHeight: '500px', overflow: 'auto' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            fontSize: '0.9375rem'
          }}>
            <thead style={{ 
              position: 'sticky', 
              top: 0, 
              backgroundColor: 'white',
              boxShadow: '0 1px 0 #e2e8f0'
            }}>
              <tr>
                <th style={{ 
                  padding: '1rem 1.5rem',
                  textAlign: 'left',
                  fontWeight: '500',
                  color: '#64748b',
                  fontSize: '0.875rem'
                }}>Email</th>
                <th style={{ 
                  padding: '1rem 1.5rem',
                  textAlign: 'left',
                  fontWeight: '500',
                  color: '#64748b',
                  fontSize: '0.875rem'
                }}>Message</th>
                <th style={{ 
                  padding: '1rem 1.5rem',
                  textAlign: 'left',
                  fontWeight: '500',
                  color: '#64748b',
                  fontSize: '0.875rem'
                }}>Requested At</th>
                <th style={{ 
                  padding: '1rem 1.5rem',
                  textAlign: 'left',
                  fontWeight: '500',
                  color: '#64748b',
                  fontSize: '0.875rem'
                }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {adminRequests.map((request, index) => (
                <tr key={index} style={{ 
                  borderTop: '1px solid #f1f5f9',
                  ':hover': {
                    backgroundColor: '#f8fafc'
                  }
                }}>
                  <td style={{ 
                    padding: '1rem 1.5rem',
                    color: '#0f172a'
                  }}>{request.email}</td>
                  <td style={{ 
                    padding: '1rem 1.5rem',
                    color: '#475569'
                  }}>{request.message}</td>
                  <td style={{ 
                    padding: '1rem 1.5rem',
                    color: '#475569'
                  }}>{formatDate(request.requested_at)}</td>
                  <td style={{ 
                    padding: '1rem 1.5rem'
                  }}>
                    <button
                      onClick={() => handleGrantAdminAccess(request.email)}
                      style={{
                        padding: '0.5rem 0.75rem',
                        backgroundColor: '#059669',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontSize: '0.875rem'
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                      Grant Access
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    ) : (
      <div style={{ 
        padding: '2rem',
        textAlign: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        border: '1px dashed #cbd5e1'
      }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4, marginBottom: '0.5rem' }}>
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <p style={{ margin: 0, color: '#64748b' }}>No pending admin access requests.</p>
      </div>
    )}
  </div>
)}

{/* Users Tab */}
{activeTab === "users" && !isLoading && (
  <div>
    <h2 style={{ 
      marginTop: 0,
      marginBottom: '1.5rem',
      color: '#0f172a',
      fontSize: '1.5rem'
    }}>Manage Users</h2>
    
    <div style={{ 
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      padding: '1.5rem',
      marginBottom: '2rem',
      border: '1px solid #e0e0e0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
    }}>
      <h3 style={{ 
        marginTop: 0,
        marginBottom: '1rem',
        color: '#0f172a',
        fontSize: '1.25rem'
      }}>Search Users</h3>
      
      <input
        type="text"
        placeholder="Search by email or name..."
        onChange={(e) => setUserFilter(e.target.value)}
        style={{ 
          width: '100%',
          padding: '0.75rem',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          fontSize: '0.9375rem'
        }}
      />
    </div>
    
    {filteredUsers.length > 0 ? (
      <div style={{ 
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e0e0e0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        overflow: 'hidden'
      }}>
        <div style={{ maxHeight: '500px', overflow: 'auto' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            fontSize: '0.9375rem'
          }}>
            <thead style={{ 
              position: 'sticky', 
              top: 0, 
              backgroundColor: 'white',
              boxShadow: '0 1px 0 #e2e8f0'
            }}>
              <tr>
                <th style={{ 
                  padding: '1rem 1.5rem',
                  textAlign: 'left',
                  fontWeight: '500',
                  color: '#64748b',
                  fontSize: '0.875rem'
                }}>Email</th>
                <th style={{ 
                  padding: '1rem 1.5rem',
                  textAlign: 'left',
                  fontWeight: '500',
                  color: '#64748b',
                  fontSize: '0.875rem'
                }}>Username</th>
                <th style={{ 
                  padding: '1rem 1.5rem',
                  textAlign: 'left',
                  fontWeight: '500',
                  color: '#64748b',
                  fontSize: '0.875rem'
                }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.email} style={{ 
                  borderTop: '1px solid #f1f5f9',
                  ':hover': {
                    backgroundColor: '#f8fafc'
                  }
                }}>
                  <td style={{ 
                    padding: '1rem 1.5rem',
                    color: '#0f172a'
                  }}>{user.email}</td>
                  <td style={{ 
                    padding: '1rem 1.5rem',
                    color: '#475569'
                  }}>{user.username || 'N/A'}</td>
                  <td style={{ 
                    padding: '1rem 1.5rem'
                  }}>
                    <button
                      onClick={() => handleDeleteUser(user.email)}
                      style={{
                        padding: '0.5rem 0.75rem',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontSize: '0.875rem'
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    ) : (
      <div style={{ 
        padding: '2rem',
        textAlign: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        border: '1px dashed #cbd5e1'
      }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4, marginBottom: '0.5rem' }}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
        <p style={{ margin: 0, color: '#64748b' }}>No users found matching your search.</p>
      </div>
    )}
  </div>
)}

{/* Admins Tab */}
{activeTab === "admins" && !isLoading && (
  <div>
    <h2 style={{ 
      marginTop: 0,
      marginBottom: '1.5rem',
      color: '#0f172a',
      fontSize: '1.5rem'
    }}>Admin Users</h2>
    
    {isDefaultAdmin ? (
      adminUsers.length > 0 ? (
        <div style={{ 
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e0e0e0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          overflow: 'hidden'
        }}>
          <div style={{ maxHeight: '500px', overflow: 'auto' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              fontSize: '0.9375rem'
            }}>
              <thead style={{ 
                position: 'sticky', 
                top: 0, 
                backgroundColor: 'white',
                boxShadow: '0 1px 0 #e2e8f0'
              }}>
                <tr>
                  <th style={{ 
                    padding: '1rem 1.5rem',
                    textAlign: 'left',
                    fontWeight: '500',
                    color: '#64748b',
                    fontSize: '0.875rem'
                  }}>Email</th>
                  <th style={{ 
                    padding: '1rem 1.5rem',
                    textAlign: 'left',
                    fontWeight: '500',
                    color: '#64748b',
                    fontSize: '0.875rem'
                  }}>Username</th>
                  <th style={{ 
                    padding: '1rem 1.5rem',
                    textAlign: 'left',
                    fontWeight: '500',
                    color: '#64748b',
                    fontSize: '0.875rem'
                  }}>Status</th>
                  <th style={{ 
                    padding: '1rem 1.5rem',
                    textAlign: 'left',
                    fontWeight: '500',
                    color: '#64748b',
                    fontSize: '0.875rem'
                  }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {adminUsers.map((admin) => (
                  <tr key={admin.email} style={{ 
                    borderTop: '1px solid #f1f5f9',
                    ':hover': {
                      backgroundColor: '#f8fafc'
                    }
                  }}>
                    <td style={{ 
                      padding: '1rem 1.5rem',
                      color: '#0f172a'
                    }}>
                      {admin.email === DEFAULT_ADMIN_EMAIL ? (
                        <span style={{ fontWeight: '600', color: '#0284c7' }}>
                          {admin.email} (Default Admin)
                        </span>
                      ) : (
                        admin.email
                      )}
                    </td>
                    <td style={{ 
                      padding: '1rem 1.5rem',
                      color: '#475569'
                    }}>{admin.username || 'N/A'}</td>
                    <td style={{ 
                      padding: '1rem 1.5rem',
                      color: '#475569'
                    }}>
                      {admin.email === DEFAULT_ADMIN_EMAIL ? (
                        <span style={{ 
                          backgroundColor: '#dcfce7',
                          color: '#166534',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: '500'
                        }}>
                          Primary Admin
                        </span>
                      ) : (
                        <span style={{ 
                          backgroundColor: '#e0f2fe',
                          color: '#0369a1',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: '500'
                        }}>
                          Admin
                        </span>
                      )}
                    </td>
                    <td style={{ 
                      padding: '1rem 1.5rem'
                    }}>
                      {admin.email !== DEFAULT_ADMIN_EMAIL && (
                        <button
                          onClick={() => handleDeleteUser(admin.email)}
                          style={{
                            padding: '0.5rem 0.75rem',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.875rem'
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                          Remove Admin
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ 
          padding: '2rem',
          textAlign: 'center',
          backgroundColor: '#f8fafc',
          borderRadius: '12px',
          border: '1px dashed #cbd5e1'
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4, marginBottom: '0.5rem' }}>
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="8.5" cy="7" r="4"></circle>
            <line x1="18" y1="8" x2="23" y2="13"></line>
            <line x1="23" y1="8" x2="18" y2="13"></line>
          </svg>
          <p style={{ margin: 0, color: '#64748b' }}>No admin users found.</p>
        </div>
      )
    ) : (
      <div style={{ 
        padding: '2rem',
        textAlign: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        border: '1px dashed #cbd5e1'
      }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4, marginBottom: '0.5rem' }}>
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 16v-4"></path>
          <path d="M12 8h.01"></path>
        </svg>
        <p style={{ margin: 0, color: '#64748b' }}>
          Only the default administrator can view the complete list of admin users.
        </p>
      </div>
    )}
  </div>
)}

</div>
    </div>
  );
}

const TabButton = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: '0.75rem 1.25rem',
      backgroundColor: active ? '#ffffff' : 'transparent',
      color: active ? '#0284c7' : '#64748b',
      border: 'none',
      borderBottom: active ? '2px solid #0284c7' : 'none',
      cursor: 'pointer',
      fontWeight: '500',
      fontSize: '0.9375rem',
      whiteSpace: 'nowrap',
      transition: 'all 0.2s',
      ':hover': {
        color: active ? '#0284c7' : '#334155'
      }
    }}
  >
    {label}
  </button>
);

const StatCard = ({ title, value, color, icon }) => (
  <div style={{ 
    backgroundColor: '#ffffff',
    border: '1px solid #e0e0e0',
    borderRadius: '12px',
    padding: '1.5rem',
    textAlign: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
  }}>
    <div style={{ 
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      width: '48px',
      height: '48px',
      borderRadius: '8px',
      backgroundColor: `${color}10`,
      margin: '0 auto 1rem auto',
      color: color
    }}>
      {icon}
    </div>
    <h3 style={{ 
      margin: '0 0 0.5rem 0',
      color: '#64748b',
      fontSize: '0.9375rem'
    }}>
      {title}
    </h3>
    <p style={{ 
      margin: 0,
      fontSize: '1.75rem',
      fontWeight: '700',
      color: '#0f172a'
    }}>
      {value}
    </p>
  </div>
);

export default AdminDashboard;