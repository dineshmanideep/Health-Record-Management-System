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
  const [user, setUser] = useState(() => authService.getCurrentUser());
  const [loading, _setLoading] = useState(false);

  useEffect(() => {
    // User is already initialized from localStorage
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
        setUser(data.data);
        return { success: true };
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
