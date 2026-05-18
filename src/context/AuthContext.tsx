// src/context/AuthContext.tsx
import { createContext, useContext, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiLogin, apiRegister } from '../api/client';

type User = {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'staff' | string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: object) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiLogin(email, password);
      if (res.success) {
        setUser(res.user);
        localStorage.setItem('wm_user', JSON.stringify(res.user));
        localStorage.setItem('wm_token', res.token || '');

        // Redirect immediately based on role
        if (res.user.role === 'admin') navigate('/dashboard/admin');
        else if (res.user.role === 'staff') navigate('/dashboard/staff');
        else navigate('/dashboard'); // fallback
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: object) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRegister(data);
      if (res.success && res.user) {
        // Auto-login the user after registration
        setUser(res.user);
        localStorage.setItem('wm_user', JSON.stringify(res.user));
        localStorage.setItem('wm_token', res.token || '');

        // Redirect based on role
        if (res.user.role === 'admin') navigate('/dashboard/admin');
        else if (res.user.role === 'staff') navigate('/dashboard/staff');
        else navigate('/dashboard');
      } else {
        throw new Error(res.message || 'Registration failed');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('wm_user');
    localStorage.removeItem('wm_token');
    navigate('/');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
