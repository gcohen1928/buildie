'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation'; // Import useRouter

interface User {
  id: string;
  email: string;
  // Add other user properties you expect from your /users/me endpoint
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email_: string, password_: string) => Promise<void>;
  signup: (email_: string, password_: string) => Promise<void>; 
  logout: () => Promise<void>; // Ensure logout is typed as async
  // Add a way to get the error message if login/signup fails
  authError: string | null;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define the backend URL from an environment variable for flexibility
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start true to check for existing session
  const [authError, setAuthError] = useState<string | null>(null);
  const router = useRouter(); // Initialize useRouter

  // Log state changes
  useEffect(() => {
    console.log("[AuthContext] State Change:", { user, token, isLoading, authError });
  }, [user, token, isLoading, authError]);

  useEffect(() => {
    const attemptLoadSession = async () => {
      console.log("[AuthContext] Attempting to load session...");
      const storedToken = localStorage.getItem('accessToken');
      console.log("[AuthContext] Stored token:", storedToken);
      if (storedToken) {
        setToken(storedToken);
        try {
          const response = await fetch(`${BACKEND_URL}/auth/users/me`, {
            headers: {
              'Authorization': `Bearer ${storedToken}`,
            },
          });
          console.log("[AuthContext] /users/me response status:", response.status);
          if (response.ok) {
            const userData = await response.json();
            console.log("[AuthContext] User data from /users/me (session load):", userData);
            setUser(userData);
          } else {
            const errorData = await response.text(); // Get text in case not JSON
            console.error("[AuthContext] Failed to fetch user from /users/me (session load):", response.status, errorData);
            localStorage.removeItem('accessToken');
            setToken(null);
            setUser(null);
          }
        } catch (error) {
          console.error("[AuthContext] Error fetching user with stored token (session load):", error);
          localStorage.removeItem('accessToken');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
      console.log("[AuthContext] Finished attempting to load session. isLoading:", false);
    };
    attemptLoadSession();
  }, []);

  const login = async (email_: string, password_: string) => {
    console.log("[AuthContext] Attempting login...");
    setIsLoading(true);
    setAuthError(null);
    try {
      const response = await fetch(`${BACKEND_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email_, password: password_ }),
      });
      const data = await response.json(); 
      console.log("[AuthContext] /auth/login response status:", response.status);
      console.log("[AuthContext] /auth/login response data:", data);
      if (!response.ok) {
        throw new Error(data.detail || 'Login failed');
      }
      localStorage.setItem('accessToken', data.access_token);
      setToken(data.access_token);
      console.log("[AuthContext] Token set. Fetching user details...");
      const userResponse = await fetch(`${BACKEND_URL}/auth/users/me`, {
        headers: { 'Authorization': `Bearer ${data.access_token}` },
      });
      console.log("[AuthContext] /users/me response status (after login):", userResponse.status);
      if (userResponse.ok) {
        const userData = await userResponse.json();
        console.log("[AuthContext] User data from /users/me (after login):", userData);
        setUser(userData);
        window.location.reload(); // Force a full page reload
      } else {
        const errorData = await userResponse.text();
        throw new Error(`Failed to fetch user details after login: ${userResponse.status} ${errorData}`);
      }
    } catch (error: any) {
      console.error("[AuthContext] Login error:", error);
      setAuthError(error.message);
      localStorage.removeItem('accessToken');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
      console.log("[AuthContext] Login attempt finished. isLoading:", false);
    }
  };
  
  const signup = async (email_: string, password_: string) => {
    console.log("[AuthContext] Attempting signup...");
    setIsLoading(true);
    setAuthError(null);
    try {
      const response = await fetch(`${BACKEND_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email_, password: password_ }),
      });
      const data = await response.json();
      console.log("[AuthContext] /auth/signup response status:", response.status);
      console.log("[AuthContext] /auth/signup response data:", data);
      if (!response.ok) {
        throw new Error(data.detail || 'Signup failed');
      }
      console.log("[AuthContext] Signup successful. User data from backend (not automatically logged in):", data);
      // User is not automatically logged in here. They need to use the login flow.
    } catch (error: any) {
      console.error("[AuthContext] Signup error:", error);
      setAuthError(error.message);
    } finally {
      setIsLoading(false);
      console.log("[AuthContext] Signup attempt finished. isLoading:", false);
      // router.refresh(); // Potentially refresh after signup if you auto-login or expect UI change
    }
  };

  const logout = async () => {
    console.log("[AuthContext] Attempting logout...");
    if (!token) {
      console.log("[AuthContext] No token found, clearing local state for logout.");
      localStorage.removeItem('accessToken');
      setToken(null);
      setUser(null);
      return;
    }
    setIsLoading(true);
    setAuthError(null);
    try {
      const response = await fetch(`${BACKEND_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json', 
        },
      });
      console.log("[AuthContext] /auth/logout response status:", response.status);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Logout failed on the server');
      }
      console.log("[AuthContext] Logout successful on server.");
    } catch (error: any) {
      console.error("[AuthContext] Server logout error:", error);
      setAuthError(error.message || 'An error occurred during server logout.');
      // Still proceed to clear client-side session regardless of server error
    } finally {
      console.log("[AuthContext] Clearing local session after logout attempt.");
      localStorage.removeItem('accessToken');
      setToken(null);
      setUser(null);
      setIsLoading(false);
      console.log("[AuthContext] Logout attempt finished. isLoading:", false);
      router.refresh(); // Force a refresh after logout too
    }
  };

  const clearAuthError = () => {
    console.log("[AuthContext] Clearing auth error.");
    setAuthError(null);
  };

  // Memoize the context value to prevent unnecessary re-renders of consumers
  // if the functions or primitive values haven't changed.
  const contextValue = React.useMemo(() => ({
    user,
    token,
    isLoading,
    login,
    signup,
    logout,
    authError,
    clearAuthError
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [user, token, isLoading, authError /* login, signup, logout, clearAuthError are stable */]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 