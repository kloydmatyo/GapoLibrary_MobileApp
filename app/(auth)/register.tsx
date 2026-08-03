import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { register } from '@/lib/api';
import Colors, { Radius } from '@/constants/colors';
import { Fonts } from '@/constants/typography';

export default function RegisterScreen() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '', phone: '', address: '', gender: '', age: '', isPwd: false, disabilityType: '',
  });
  const [loading, setLoading] = useState(false);

  const set = (key: string) => (val: string) => setForm((f) => ({ ...f, [key]: val }));
  const setGender = (gender: string) => setForm((f) => ({ ...f, gender }));
  const togglePwd = () => setForm((f) => ({ ...f, isPwd: !f.isPwd, disabilityType: !f.isPwd ? f.disabilityType : '' }));

  const handleRegister = async () => {
    if (!form.firstName || !form.lastName || !form.email || !form.password || !form.gender || !form.age) {
      return Alert.alert('Error', 'Please fill in all required fields.');
    }
    setLoading(true);
    try {
      await register({
        ...form,
        age: Number(form.age),
        isPwd: form.isPwd,
        disabilityType: form.isPwd ? form.disabilityType : undefined,
      });
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

          <TextInput
            style={styles.input}
            placeholder="First Name *"
            value={form.firstName}
            onChangeText={set('firstName')}
            autoCapitalize="words"
            placeholderTextColor={Colors.textMuted}
          />
          <TextInput
            style={styles.input}
            placeholder="Last Name *"
            value={form.lastName}
            onChangeText={set('lastName')}
            autoCapitalize="words"
            placeholderTextColor={Colors.textMuted}
          />

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Gender *</Text>
            <View style={styles.genderRow}>
              {['Male', 'Female', 'Other'].map((gender) => (
                <TouchableOpacity
                  key={gender}
                  style={[styles.genderButton, form.gender === gender && styles.genderButtonActive]}
                  onPress={() => setGender(gender)}
                >
                  <Text style={[styles.genderButtonText, form.gender === gender && styles.genderButtonTextActive]}>
                    {gender}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Age *"
            value={form.age}
            onChangeText={set('age')}
            keyboardType="numeric"
            placeholderTextColor={Colors.textMuted}
          />

          <View style={styles.pwdRow}>
            <TouchableOpacity style={styles.checkbox} onPress={togglePwd} activeOpacity={0.8}>
              <View style={[styles.checkboxBox, form.isPwd && styles.checkboxBoxActive]}>
                {form.isPwd ? <Text style={styles.checkboxMark}>✓</Text> : null}
              </View>
            </TouchableOpacity>
            <Text style={styles.pwdLabel}>PWD (Person with Disability)</Text>
          </View>

          {form.isPwd ? (
            <TextInput
              style={styles.input}
              placeholder="Disability Type"
              value={form.disabilityType}
              onChangeText={set('disabilityType')}
              placeholderTextColor={Colors.textMuted}
            />
          ) : null}

          <TextInput
            style={styles.input}
            placeholder="Email *"
            value={form.email}
            onChangeText={set('email')}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={Colors.textMuted}
          />
          <TextInput
            style={styles.input}
            placeholder="Password *"
            value={form.password}
            onChangeText={set('password')}
            secureTextEntry
            placeholderTextColor={Colors.textMuted}
          />
          <TextInput
            style={styles.input}
            placeholder="Phone (optional)"
            value={form.phone}
            onChangeText={set('phone')}
            keyboardType="phone-pad"
            placeholderTextColor={Colors.textMuted}
          />
          <TextInput
            style={styles.input}
            placeholder="Address (optional)"
            value={form.address}
            onChangeText={set('address')}
            placeholderTextColor={Colors.textMuted}
          />

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
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.container * 2,
    padding: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  title: { fontSize: 26, fontFamily: Fonts.heading, color: Colors.brand, textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 14, fontFamily: Fonts.body, color: Colors.textSecond, textAlign: 'center', marginBottom: 20 },
  fieldGroup: { marginBottom: 10 },
  label: { fontSize: 14, fontFamily: Fonts.bodyMedium, color: Colors.textPrimary, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.container,
    padding: 12,
    marginBottom: 10,
    fontSize: 15,
    fontFamily: Fonts.body,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
  },
  genderRow: { flexDirection: 'row', gap: 8 },
  genderButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: Radius.container,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  genderButtonActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  genderButtonText: { fontSize: 14, fontFamily: Fonts.bodySemiBold, color: Colors.textSecond },
  genderButtonTextActive: { color: '#fff' },
  pwdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkbox: { marginRight: 10 },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: Radius.inner,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  checkboxMark: { color: '#fff', fontSize: 14, fontFamily: Fonts.bodyBold, lineHeight: 16 },
  pwdLabel: { fontSize: 14, fontFamily: Fonts.body, color: Colors.textPrimary, flex: 1 },
  button: { backgroundColor: Colors.brand, borderRadius: Radius.container, padding: 14, alignItems: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontFamily: Fonts.bodySemiBold, fontSize: 16 },
  link: { marginTop: 16, alignItems: 'center' },
  linkText: { color: Colors.brand, fontSize: 14, fontFamily: Fonts.bodyMedium },
});
