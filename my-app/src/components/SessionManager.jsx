import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function SessionManager() {
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = () => {
      const token = localStorage.getItem("access_token");
      const expiresAt = localStorage.getItem("expires_at");

      if (!token || (expiresAt && new Date(expiresAt) < new Date())) {
        localStorage.clear();
        navigate("/login", { 
          replace: true,
          state: { from: window.location.pathname }
        });
      }
    };

    // Check session every minute
    const interval = setInterval(checkSession, 60000);
    
    // Check session on visibility change
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [navigate]);

  return null;
}

export default SessionManager;