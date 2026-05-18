// src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiLogin, apiRegister } from '../api/client';

export type Role = 'admin' | 'staff' | 'customer';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  barangay: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: any) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  // Restore user from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('wm_user');
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  // Login
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const data = await apiLogin(email, password);
      if (data?.success && data.user) {
        setUser(data.user);
        localStorage.setItem('wm_user', JSON.stringify(data.user));
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // Register
  const register = async (data: any): Promise<boolean> => {
    try {
      const res = await apiRegister(data);
      return res?.success ?? false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // Logout
  const logout = () => {
    setUser(null);
    localStorage.removeItem('wm_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
