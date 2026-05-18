import React, { createContext, useContext, useState, useEffect } from "react";
import { apiLogin, apiRegister } from "../api/client";

export type Role = "admin" | "staff" | "customer";

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
  register: (data: {
    name: string;
    email: string;
    password: string;
    contact_number: string;
    barangay: string;
    role: Role;
  }) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  // Restore user on refresh
  useEffect(() => {
    const savedUser = localStorage.getItem("wm_user");
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  // Login via backend API
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const data = await apiLogin(email, password);
      if (data?.success) {
        const loggedInUser: User = {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role,
          barangay: data.user.barangay || "Panalaron",
        };
        setUser(loggedInUser);
        localStorage.setItem("wm_user", JSON.stringify(loggedInUser));
        return true;
      } else return false;
    } catch (err) {
      console.error("Login failed:", err);
      return false;
    }
  };

  // Register via backend API
  const register = async (data: {
    name: string;
    email: string;
    password: string;
    contact_number: string;
    barangay: string;
    role: Role;
  }): Promise<boolean> => {
    try {
      const result = await apiRegister(data);
      if (result?.success) return true;
      return false;
    } catch (err) {
      console.error("Registration failed:", err);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("wm_user");
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
