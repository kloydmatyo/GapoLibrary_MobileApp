import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Colors from '@/constants/colors';
import { BASE_URL } from '@/lib/api';

type Status = 'loading' | 'success' | 'error';

export default function VerifyEmailScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided.');
      return;
    }

    const verifyEmail = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/auth/verify-email?token=${token}`);
        setStatus('success');
        setMessage(res.data.message || 'Email verified successfully!');
        setTimeout(() => router.replace('/(auth)/login'), 3000);
      } catch (err: any) {
        setStatus('error');
        setMessage(err?.response?.data?.error || 'Verification failed. Please try again.');
      }
    };

    verifyEmail();
  }, [token, router]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name="book" size={36} color="#fff" />
        </View>
        <Text style={styles.title}>GapoLibrary</Text>

        {status === 'loading' && (
          <View style={styles.content}>
            <ActivityIndicator size="large" color={Colors.brand} />
            <Text style={styles.loadingText}>Verifying your email...</Text>
          </View>
        )}

        {status === 'success' && (
          <View style={styles.content}>
            <View style={[styles.statusIcon, { backgroundColor: Colors.primary[100] }]}>
              <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
            </View>
            <Text style={styles.message}>{message}</Text>
            <Text style={styles.subMessage}>Redirecting to login...</Text>
          </View>
        )}

        {status === 'error' && (
          <View style={styles.content}>
            <View style={[styles.statusIcon, { backgroundColor: Colors.errorBg }]}>
              <Ionicons name="close-circle" size={48} color={Colors.error} />
            </View>
            <Text style={styles.message}>{message}</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => router.replace('/(auth)/login')}
            >
              <Text style={styles.buttonText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: Colors.brand,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.brand,
    marginBottom: 24,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: Colors.textSecond,
  },
  statusIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subMessage: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  button: {
    backgroundColor: Colors.brand,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
