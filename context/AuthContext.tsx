import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { clearTokenCache, login as apiLogin, logout as apiLogout } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'staff' | 'user';
  patronId?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

function isSessionTokenValid(token: string): boolean {
  try {
    const decoded = typeof globalThis.atob === 'function' ? globalThis.atob(token) : '';
    const parsed = JSON.parse(decoded);
    return typeof parsed.timestamp === 'number' && Date.now() - parsed.timestamp <= 7 * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [storedUser, storedToken] = await Promise.all([
        SecureStore.getItemAsync('user_data'),
        SecureStore.getItemAsync('session_token'),
      ]);

      if (storedUser && storedToken && isSessionTokenValid(storedToken)) {
        setUser(JSON.parse(storedUser));
      } else {
        if (storedUser) {
          await SecureStore.deleteItemAsync('user_data');
        }
        if (storedToken && !isSessionTokenValid(storedToken)) {
          await SecureStore.deleteItemAsync('session_token');
        }
        setUser(null);
      }
      setLoading(false);
    })();
  }, []);

  const signIn = async (email: string, password: string) => {
    const res = await apiLogin(email, password);
    const { user: userData, sessionToken } = res.data;

    // Store the session token from response body (not from headers)
    if (sessionToken) {
      await SecureStore.setItemAsync('session_token', sessionToken);
    }
    
    await SecureStore.setItemAsync('user_data', JSON.stringify(userData));
    setUser(userData);
  };

  const signOut = async () => {
    try { await apiLogout(); } catch {}
    clearTokenCache();
    await SecureStore.deleteItemAsync('session_token');
    await SecureStore.deleteItemAsync('user_data');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
