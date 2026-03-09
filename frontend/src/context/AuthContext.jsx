import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, verify the stored token is still valid.
  // This prevents stale/expired tokens from keeping the UI in a logged-in state.
  useEffect(() => {
    const verifySession = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const data = await authService.verifyToken();
        if (data.success) {
          // Update stored user with fresh data from the server
          const freshUser = { ...data.data, token };
          localStorage.setItem('user', JSON.stringify(freshUser));
          setUser(freshUser);
        } else {
          authService.logout();
          setUser(null);
        }
      } catch {
        // 401 interceptor already clears localStorage and redirects;
        // just ensure user state is cleared here too
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    verifySession();
  }, []);

  const login = async (credentials) => {
    try {
      const data = await authService.login(credentials);
      if (data.success) {
        setUser(data.data);
        return { success: true };
      }
      return { success: false, message: data.message };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed'
      };
    }
  };

  const signup = async (userData) => {
    try {
      const data = await authService.signup(userData);
      if (data.success) {
        if (!data.pending) {
          // Patient — account is immediately active, set user state
          setUser(data.data);
        }
        // Pending roles (hospital/doctor/nurse) — do not set user, pass info to caller
        return { success: true, pending: data.pending || false, message: data.message };
      }
      return { success: false, message: data.message };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Signup failed'
      };
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const value = {
    user,
    login,
    signup,
    logout,
    loading,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
