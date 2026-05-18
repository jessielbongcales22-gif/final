import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { seedUsers } from '../data/seed';

// ── API config (read at runtime from vite env) ───────────────────────────────
const API_URL    = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const USE_API    = import.meta.env.VITE_USE_API === 'true';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<User | null>;
  register: (data: Omit<User, 'id' | 'createdAt'>) => Promise<User>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isCustomer: boolean;
  usingApi: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ── localStorage helpers ──────────────────────────────────────────────────────
function getLocalUsers(): User[] {
  try {
    const stored = localStorage.getItem('wm_users');
    const parsed: User[] = stored ? JSON.parse(stored) : [];
    const merged = [...parsed];
    for (const seed of seedUsers) {
      if (!merged.find(u => u.email === seed.email)) merged.push(seed);
    }
    return merged;
  } catch { return seedUsers; }
}
function saveLocalUsers(users: User[]) {
  localStorage.setItem('wm_users', JSON.stringify(users));
}

// ── API helpers ───────────────────────────────────────────────────────────────
async function apiRequest(path: string, body: object) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]         = useState<User | null>(null);
  const [usingApi, setUsingApi] = useState(false);

  useEffect(() => {
    saveLocalUsers(getLocalUsers()); // always ensure seed users exist

    // Restore session
    try {
      const session = localStorage.getItem('wm_user');
      if (session) setUser(JSON.parse(session));
    } catch { localStorage.removeItem('wm_user'); }

    // Check if API is reachable
    if (USE_API) {
      fetch(`${API_URL}/health`)
        .then(r => r.ok ? setUsingApi(true) : setUsingApi(false))
        .catch(() => setUsingApi(false));
    }
  }, []);

  // ── LOGIN ────────────────────────────────────────────────────────────────
  const login = async (email: string, password: string): Promise<User | null> => {
    // Try API first
    if (USE_API) {
      try {
        const data = await apiRequest('/auth/login', { email, password });
        localStorage.setItem('wm_token', data.token);
        const u: User = { ...data.user, password: '' };
        setUser(u);
        localStorage.setItem('wm_user', JSON.stringify(u));
        setUsingApi(true);
        return u;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '';
        if (msg === 'Invalid email or password') return null;
        // Network error — surface it instead of silently falling back
        throw new Error('Cannot connect to the server. Please check your internet connection.');
      }
    }

    // localStorage mode (only when VITE_USE_API=false)
    const users = getLocalUsers();
    const found = users.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (found) {
      setUser(found);
      localStorage.setItem('wm_user', JSON.stringify(found));
      return found;
    }
    return null;
  };

  // ── REGISTER ─────────────────────────────────────────────────────────────
  const register = async (data: Omit<User, 'id' | 'createdAt'>): Promise<User> => {
    if (USE_API) {
      try {
        const result = await apiRequest('/auth/register', data);
        localStorage.setItem('wm_token', result.token);
        const u: User = { ...result.user, password: '' };
        setUser(u);
        localStorage.setItem('wm_user', JSON.stringify(u));
        setUsingApi(true);
        return u;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '';
        if (msg.includes('already exists')) throw new Error(msg);
        // Surface the error so the user knows registration didn't save to the database
        throw new Error(
          'Cannot connect to the server right now. Please check your internet connection and try again. (Your account was not created.)'
        );
      }
    }

    // localStorage fallback (only used when VITE_USE_API=false)
    const users = getLocalUsers();
    if (users.find(u => u.email.toLowerCase() === data.email.toLowerCase())) {
      throw new Error('Email already exists.');
    }
    const newUser: User = { ...data, id: 'u' + Date.now(), createdAt: new Date().toISOString() };
    saveLocalUsers([...users, newUser]);
    setUser(newUser);
    localStorage.setItem('wm_user', JSON.stringify(newUser));
    return newUser;
  };

  // ── LOGOUT ───────────────────────────────────────────────────────────────
  const logout = () => {
    setUser(null);
    localStorage.removeItem('wm_user');
    localStorage.removeItem('wm_token');
  };

  return (
    <AuthContext.Provider value={{
      user, login, register, logout, usingApi,
      isAuthenticated: !!user,
      isAdmin:    user?.role === 'admin',
      isStaff:    user?.role === 'staff',
      isCustomer: user?.role === 'customer',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
