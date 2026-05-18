import React, { createContext, useContext, useState, useCallback } from 'react';
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
