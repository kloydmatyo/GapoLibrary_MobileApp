import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { login as apiLogin, logout as apiLogout } from '@/lib/api';

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

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const stored = await SecureStore.getItemAsync('user_data');
      if (stored) setUser(JSON.parse(stored));
      setLoading(false);
    })();
  }, []);

  const signIn = async (email: string, password: string) => {
    const res = await apiLogin(email, password);
    const { user: userData } = res.data;

    const sessionToken = res.headers['set-cookie']?.[0]
      ?.split(';')[0]
      ?.replace('session=', '') ?? '';

    await SecureStore.setItemAsync('session_token', sessionToken);
    await SecureStore.setItemAsync('user_data', JSON.stringify(userData));
    setUser(userData);
  };

  const signOut = async () => {
    try { await apiLogout(); } catch {}
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
