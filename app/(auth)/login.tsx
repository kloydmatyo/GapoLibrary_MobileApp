import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert('Error', 'Please fill in all fields.');
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (err: any) {
      const errData = err?.response?.data;
      let msg = 'Login failed. Check your credentials.';
      if (typeof errData === 'string' && errData.length > 0) {
        msg = errData;
      } else if (errData && typeof errData === 'object') {
        msg = errData.error ?? errData.message ?? msg;
      } else if (err?.message && !err.message.includes('Network Error') === false) {
        msg = 'Cannot connect to server. Check your network or API URL.';
      } else if (err?.message) {
        msg = err.message;
      }
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.card}>
        <Text style={styles.title}>GapoLibrary</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign In</Text>}
        </TouchableOpacity>

        <Link href="/(auth)/register" asChild>
          <TouchableOpacity style={styles.link}>
            <Text style={styles.linkText}>Don't have an account? Register</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4ff', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 24, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8 },
  title: { fontSize: 28, fontWeight: '700', color: '#1a56db', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 15 },
  button: { backgroundColor: '#1a56db', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  link: { marginTop: 16, alignItems: 'center' },
  linkText: { color: '#1a56db', fontSize: 14 },
});
