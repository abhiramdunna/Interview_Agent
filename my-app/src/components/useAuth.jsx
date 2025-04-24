// Create a new file useAuth.js
import { useState, useEffect } from 'react';

export function useAuth() {
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    role: null,
    isLoading: true
  });

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const role = localStorage.getItem("role");
    
    setAuthState({
      isAuthenticated: !!token,
      role,
      isLoading: false
    });
  }, []);

  return authState;
}