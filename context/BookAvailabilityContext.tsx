import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import api from '@/lib/api';

interface BookAvailability {
  [bookId: string]: {
    availableCopies: number;
    totalCopies: number;
    lastUpdated: number;
  };
}

interface BookAvailabilityContextType {
  availability: BookAvailability;
  updateBookAvailability: (bookId: string) => Promise<void>;
  refreshAllBooks: () => void;
  isRefreshing: boolean;
}

const BookAvailabilityContext = createContext<BookAvailabilityContextType>({
  availability: {},
  updateBookAvailability: async () => {},
  refreshAllBooks: () => {},
  isRefreshing: false,
});

export function BookAvailabilityProvider({ children }: { children: React.ReactNode }) {
  const [availability, setAvailability] = useState<BookAvailability>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  // Update a single book's availability
  const updateBookAvailability = useCallback(async (bookId: string) => {
    try {
      const response = await api.get(`/books/${bookId}`);
      const book = response.data.book;
      
      setAvailability(prev => ({
        ...prev,
        [bookId]: {
          availableCopies: book.availableCopies,
          totalCopies: book.totalCopies,
          lastUpdated: Date.now(),
        },
      }));
    } catch (error) {
      console.error(`Failed to update availability for book ${bookId}:`, error);
    }
  }, []);

  // Refresh all tracked books
  const refreshAllBooks = useCallback(() => {
    setIsRefreshing(true);
    const bookIds = Object.keys(availability);
    
    Promise.all(bookIds.map(id => updateBookAvailability(id)))
      .finally(() => setIsRefreshing(false));
  }, [availability, updateBookAvailability]);

  // Auto-refresh when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground, refresh availability
        refreshAllBooks();
      }
      setAppState(nextAppState);
    });

    return () => subscription.remove();
  }, [appState, refreshAllBooks]);

  // Periodic refresh every 30 seconds for tracked books
  useEffect(() => {
    const interval = setInterval(() => {
      if (Object.keys(availability).length > 0) {
        refreshAllBooks();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [availability, refreshAllBooks]);

  return (
    <BookAvailabilityContext.Provider
      value={{
        availability,
        updateBookAvailability,
        refreshAllBooks,
        isRefreshing,
      }}
    >
      {children}
    </BookAvailabilityContext.Provider>
  );
}

export const useBookAvailability = () => useContext(BookAvailabilityContext);
