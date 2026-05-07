import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Points to the deployed Next.js web app on Vercel
// During local dev, replace with your PC's IP: http://192.168.x.x:3000/api
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://your-gapolibrary-app.vercel.app/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('session_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
    config.headers['Cookie'] = `session=${token}`;
  }
  return config;
});

export default api;

// --- Auth ---
export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password });

export const register = (data: {
  email: string; password: string; firstName: string; lastName: string;
  phone?: string; address?: string; memberCategory?: string;
}) => api.post('/auth/register', data);

export const logout = () => api.post('/auth/logout');

// --- Books ---
export const getBooks = (params?: { search?: string; category?: string; available?: boolean }) =>
  api.get('/books', { params });

export const getBook = (id: string) => api.get(`/books/${id}`);

// --- Circulation ---
export const getHistory = (userId?: string) =>
  api.get('/circulation/history', { params: userId ? { userId } : {} });

export const borrowBook = (bookId: string) =>
  api.post('/circulation/checkout', { bookId });

// --- Reservations ---
export const createReservation = (bookId: string) =>
  api.post('/reservations', { bookId });

export const getReservations = (bookId?: string) =>
  api.get('/reservations', { params: bookId ? { bookId } : {} });

export const cancelReservation = (reservationId: string) =>
  api.delete('/reservations', { data: { reservationId } });

// --- Email Verification ---
export const resendVerificationEmail = (email: string) =>
  api.post('/auth/resend-verification', { email });
