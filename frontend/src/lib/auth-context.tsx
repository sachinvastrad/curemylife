'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Cookies from 'js-cookie';
import { authApi } from '@/lib/api';

interface User {
  id: string;
  email?: string;
  name: string;
  role: 'patient' | 'doctor' | 'admin';
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (tokens: { accessToken: string; refreshToken: string }, user: User) => void;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async () => {
    const token = Cookies.get('accessToken');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await authApi.getProfile();
      setUser(data);
    } catch {
      Cookies.remove('accessToken');
      Cookies.remove('refreshToken');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const login = (tokens: { accessToken: string; refreshToken: string }, userData: User) => {
    Cookies.set('accessToken', tokens.accessToken, { expires: 7 });
    Cookies.set('refreshToken', tokens.refreshToken, { expires: 30 });
    setUser(userData);
  };

  const logout = () => {
    Cookies.remove('accessToken');
    Cookies.remove('refreshToken');
    setUser(null);
    window.location.href = '/login';
  };

  const refreshProfile = async () => {
    await loadProfile();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
