// src/context/authContext.tsx
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface AuthContextType {
  user: any | null;
  token: string | null;
  setUser: (user: any) => void;
  setToken: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<any | null>(() => {
    const saved = localStorage.getItem('wm_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setTokenState] = useState<string | null>(() => {
    return localStorage.getItem('wm_token') || null;
  });

  const setUser = (u: any) => {
    setUserState(u);
    localStorage.setItem('wm_user', JSON.stringify(u));
  };

  const setToken = (t: string) => {
    setTokenState(t);
    localStorage.setItem('wm_token', t);
  };

  const logout = () => {
    setUserState(null);
    setTokenState(null);
    localStorage.removeItem('wm_user');
    localStorage.removeItem('wm_token');
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, token, setUser, setToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
