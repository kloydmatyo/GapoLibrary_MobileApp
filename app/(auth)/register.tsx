import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { register } from '@/lib/api';
import Colors from '@/constants/colors';

export default function RegisterScreen() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '', phone: '', address: '',
  });
  const [loading, setLoading] = useState(false);

  const set = (key: string) => (val: string) => setForm((f) => ({ ...f, [key]: val }));

  const handleRegister = async () => {
    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      return Alert.alert('Error', 'Please fill in all required fields.');
    }
    setLoading(true);
    try {
      await register(form);
      Alert.alert('Success', 'Account created! Please check your email to verify your account.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Registration failed.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join GapoLibrary today</Text>

          {[
            { key: 'firstName', placeholder: 'First Name *' },
            { key: 'lastName', placeholder: 'Last Name *' },
            { key: 'email', placeholder: 'Email *', keyboard: 'email-address' as const, autoCapitalize: 'none' as const },
            { key: 'password', placeholder: 'Password *', secure: true },
            { key: 'phone', placeholder: 'Phone (optional)', keyboard: 'phone-pad' as const },
            { key: 'address', placeholder: 'Address (optional)' },
          ].map(({ key, placeholder, keyboard, autoCapitalize, secure }) => (
            <TextInput
              key={key}
              style={styles.input}
              placeholder={placeholder}
              value={(form as any)[key]}
              onChangeText={set(key)}
              keyboardType={keyboard}
              autoCapitalize={autoCapitalize ?? 'words'}
              secureTextEntry={secure}
            />
          ))}

          <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Register</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.link} onPress={() => router.back()}>
            <Text style={styles.linkText}>Already have an account? Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: Colors.background, padding: 24, flexGrow: 1, justifyContent: 'center' },
  card: { backgroundColor: Colors.surface, borderRadius: 16, padding: 24, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8 },
  title: { fontSize: 26, fontWeight: '700', color: Colors.brand, textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 14, color: Colors.textSecond, textAlign: 'center', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 12, marginBottom: 10, fontSize: 15 },
  button: { backgroundColor: Colors.brand, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  link: { marginTop: 16, alignItems: 'center' },
  linkText: { color: Colors.brand, fontSize: 14 },
});
