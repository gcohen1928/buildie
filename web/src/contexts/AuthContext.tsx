'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
// import { useRouter } from 'next/navigation'; // Uncomment if needed for redirects

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
  logout: () => void;
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
  // const router = useRouter(); // Uncomment for redirects

  useEffect(() => {
    const attemptLoadSession = async () => {
      const storedToken = localStorage.getItem('accessToken');
      if (storedToken) {
        setToken(storedToken);
        try {
          const response = await fetch(`${BACKEND_URL}/auth/users/me`, {
            headers: {
              'Authorization': `Bearer ${storedToken}`,
            },
          });
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
          } else {
            // Token might be invalid or expired
            localStorage.removeItem('accessToken');
            setToken(null);
            setUser(null);
          }
        } catch (error) {
          console.error("Failed to fetch user with stored token", error);
          localStorage.removeItem('accessToken');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };
    attemptLoadSession();
  }, []);

  const login = async (email_: string, password_: string) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const response = await fetch(`${BACKEND_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email_, password: password_ }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Login failed');
      }
      localStorage.setItem('accessToken', data.access_token);
      setToken(data.access_token);
      // Fetch user data after successful login
      const userResponse = await fetch(`${BACKEND_URL}/auth/users/me`, {
        headers: { 'Authorization': `Bearer ${data.access_token}` },
      });
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUser(userData);
      } else {
        throw new Error('Failed to fetch user details after login.');
      }
      // router.push('/dashboard'); // Example redirect
    } catch (error: any) {
      setAuthError(error.message);
      console.error("Login error:", error);
      // Ensure token and user are cleared on error
      localStorage.removeItem('accessToken');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };
  
  const signup = async (email_: string, password_: string) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const response = await fetch(`${BACKEND_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email_, password: password_ }),
      });
      const data = await response.json(); // Attempt to parse JSON even for errors
      if (!response.ok) {
        throw new Error(data.detail || 'Signup failed');
      }
      // User created, but not logged in by default. 
      // You might want to automatically log them in or prompt them to login.
      // For now, just indicate success. They can then login.
      // Or, if your backend returns a token on signup (not typical for Supabase basic signup):
      // localStorage.setItem('accessToken', data.access_token);
      // setToken(data.access_token);
      // setUser(data.user); 
      console.log("Signup successful, user data from backend:", data.user); // data.user is what our backend returns
      // router.push('/login'); // Example redirect
    } catch (error: any) {
      setAuthError(error.message);
      console.error("Signup error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    setToken(null);
    setUser(null);
    // router.push('/login'); // Example redirect
  };

  const clearAuthError = () => {
    setAuthError(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, signup, logout, authError, clearAuthError }}>
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