import React, { createContext, useContext, useState, useEffect } from 'react';
import { getHistory } from '@/lib/api';
import { useAuth } from './AuthContext';

interface OverdueContextType {
  overdueCount: number;
  refreshOverdueCount: () => Promise<void>;
  setOverdueCount: React.Dispatch<React.SetStateAction<number>>;
}

const OverdueContext = createContext<OverdueContextType>({
  overdueCount: 0,
  refreshOverdueCount: async () => {},
  setOverdueCount: () => {},
});

export function OverdueProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [overdueCount, setOverdueCount] = useState(0);

  const refreshOverdueCount = async () => {
    if (!user) {
      setOverdueCount(0);
      return;
    }

    try {
      const res = await getHistory();
      const overdue = res.data.history.filter(
        (item: any) => item.status === 'overdue'
      ).length;
      setOverdueCount(overdue);
    } catch (err: any) {
      // Silently fail - don't crash the app if API is unavailable
      console.log('Could not fetch overdue count:', err.message);
      setOverdueCount(0);
    }
  };

  useEffect(() => {
    if (user) {
      refreshOverdueCount();
      
      // Refresh every 15 minutes
      const interval = setInterval(refreshOverdueCount, 15 * 60 * 1000);
      return () => clearInterval(interval);
    } else {
      setOverdueCount(0);
    }
  }, [user]);

  return (
    <OverdueContext.Provider value={{ overdueCount, refreshOverdueCount, setOverdueCount }}>
      {children}
    </OverdueContext.Provider>
  );
}

export const useOverdue = () => useContext(OverdueContext);
