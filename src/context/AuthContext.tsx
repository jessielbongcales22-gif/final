import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'https://your-backend-url.com/api';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<User | null>;
  register: (data: Omit<User, 'id' | 'createdAt'>) => Promise<User>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isCustomer: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function apiRequest(path: string, body: object) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const session = localStorage.getItem('wm_user');
    if (session) setUser(JSON.parse(session));
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const data = await apiRequest('/login', { email, password });
      setUser(data.user);
      localStorage.setItem('wm_user', JSON.stringify(data.user));
      return data.user;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const register = async (data: Omit<User, 'id' | 'createdAt'>) => {
    const res = await apiRequest('/register', data);
    setUser(res.user);
    localStorage.setItem('wm_user', JSON.stringify(res.user));
    return res.user;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('wm_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isStaff: user?.role === 'staff',
        isCustomer: user?.role === 'customer',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
