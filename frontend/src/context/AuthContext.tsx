import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi, customerApi } from '../api/bankingApi';
import type { AuthResponse, Customer, UserProfile } from '../types/banking';

interface AuthContextValue {
  user: UserProfile | null;
  customer: Customer | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<UserProfile>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshCustomer: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const raw = localStorage.getItem('user');
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  });
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const persistSession = (auth: AuthResponse) => {
    localStorage.setItem('accessToken', auth.accessToken);
    localStorage.setItem('refreshToken', auth.refreshToken);
    localStorage.setItem('user', JSON.stringify(auth.user));
    setUser(auth.user);
  };

  const refreshCustomer = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setCustomer(null);
      return;
    }
    try {
      const res = await customerApi.getMe();
      setCustomer(res.data.data);
    } catch {
      // Customer profile may not be onboarded yet (404) or user is STAFF/ADMIN
      setCustomer(null);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const meRes = await authApi.me();
          setUser(meRes.data.data);
          localStorage.setItem('user', JSON.stringify(meRes.data.data));
          await refreshCustomer();
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          setUser(null);
        }
      }
      setIsLoading(false);
    };
    init();
  }, [refreshCustomer]);

  const login = async (usernameOrEmail: string, password: string) => {
    const res = await authApi.login(usernameOrEmail, password);
    persistSession(res.data.data);
    await refreshCustomer();
    return res.data.data.user;
  };

  const register = async (username: string, email: string, password: string) => {
    const res = await authApi.register(username, email, password);
    persistSession(res.data.data);
    setCustomer(null);
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // Ignore logout network error
      }
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
    setCustomer(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        customer,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshCustomer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
