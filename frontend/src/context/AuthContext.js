'use client';

import React, { createContext, useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/navigation';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

  useEffect(() => {
    const verifySession = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          setToken(data.token);
          localStorage.setItem('haqms_user', JSON.stringify(data.user));
        } else {
          localStorage.removeItem('haqms_user');
          setUser(null);
          setToken(null);
        }
      } catch (e) {
        console.error('Failed to verify session with backend', e);
        const storedUser = localStorage.getItem('haqms_user');
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch (err) {
            setUser(null);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Inconsistent API returns nested success format for login
      const receivedToken = data.data.token;
      const receivedUser = data.data.user;

      // SECURITY ISSUE FIXED: Storing sensitive auth credentials directly in LocalStorage!
      // We only store non-sensitive user metadata here, the token is kept in-memory
      // and in the HttpOnly cookie.
      localStorage.setItem('haqms_user', JSON.stringify(receivedUser));

      setToken(receivedToken);
      setUser(receivedUser);

      router.push('/dashboard');
      return { success: true };
    } catch (err) {
      console.error('[AUTH-ERROR] Login request failed:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password, role = 'RECEPTIONIST') => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // If registration succeeds, log them in automatically or redirect to login.
      // Notice inconsistency: signup API returns flat user structure inside "user"
      // we can trigger login for them.
      return login(email, password);
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (e) {
      console.error('Failed to log out from backend', e);
    }
    localStorage.removeItem('haqms_user');
    setToken(null);
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        login,
        register,
        logout,
        API_BASE_URL, // Exposing hardcoded API base URL for convenience
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
