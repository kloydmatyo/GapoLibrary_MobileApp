import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Colors, { Radius } from '@/constants/colors';
import { Fonts } from '@/constants/typography';

const cardShadow = {
  elevation: 2 as const,
  shadowColor: Colors.shadow,
  shadowOpacity: 0.05,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 2 },
};

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  gender?: string;
  age?: number;
}

export default function EditProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    gender: '',
    age: undefined,
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/user/profile');
      const userData = response.data.user;
      setProfile({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        email: userData.email || '',
        phone: userData.phone || '',
        address: userData.address || '',
        gender: userData.gender || '',
        age: userData.age || undefined,
      });
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      Alert.alert('Error', 'Could not load profile data.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!profile.firstName.trim() || !profile.lastName.trim()) {
      Alert.alert('Validation Error', 'First name and last name are required.');
      return;
    }

    if (!profile.email.trim()) {
      Alert.alert('Validation Error', 'Email is required.');
      return;
    }

    setSaving(true);
    try {
      await api.put('/user/profile', {
        firstName: profile.firstName.trim(),
        lastName: profile.lastName.trim(),
        phone: profile.phone?.trim() || undefined,
        address: profile.address?.trim() || undefined,
        gender: profile.gender?.trim() || undefined,
        age: profile.age || undefined,
      });

      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      Alert.alert(
        'Error',
        error?.response?.data?.error || 'Could not update profile. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile.firstName.charAt(0).toUpperCase()}
              {profile.lastName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.patronId}>Patron ID: {user?.patronId}</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* First Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              First Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={profile.firstName}
              onChangeText={(text) => setProfile({ ...profile, firstName: text })}
              placeholder="Enter first name"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          {/* Last Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Last Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={profile.lastName}
              onChangeText={(text) => setProfile({ ...profile, lastName: text })}
              placeholder="Enter last name"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          {/* Email (Read-only) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={profile.email}
              editable={false}
              placeholderTextColor={Colors.textMuted}
            />
            <Text style={styles.helperText}>Email cannot be changed</Text>
          </View>

          {/* Phone */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={profile.phone}
              onChangeText={(text) => setProfile({ ...profile, phone: text })}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          {/* Address */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={profile.address}
              onChangeText={(text) => setProfile({ ...profile, address: text })}
              placeholder="Enter address"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          {/* Gender */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.genderButtons}>
              {['Male', 'Female', 'Other'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.genderButton,
                    profile.gender === option && styles.genderButtonActive,
                  ]}
                  onPress={() => setProfile({ ...profile, gender: option })}
                >
                  <Text
                    style={[
                      styles.genderButtonText,
                      profile.gender === option && styles.genderButtonTextActive,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Age */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Age</Text>
            <TextInput
              style={styles.input}
              value={profile.age?.toString() || ''}
              onChangeText={(text) => {
                const age = parseInt(text);
                setProfile({ ...profile, age: isNaN(age) ? undefined : age });
              }}
              placeholder="Enter age"
              keyboardType="number-pad"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    ...cardShadow,
  },
  backButton: { padding: 4, marginRight: 12 },
  headerTitle: { fontSize: 20, fontFamily: Fonts.heading, color: Colors.textPrimary, flex: 1 },
  headerSpacer: { width: 40 },
  content: { flex: 1 },
  contentContainer: { padding: 20 },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.accent, justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  avatarText: { fontSize: 28, fontFamily: Fonts.heading, color: '#fff' },
  patronId: { fontSize: 13, fontFamily: Fonts.body, color: Colors.textMuted },
  form: { marginBottom: 20 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontFamily: Fonts.bodyMedium, color: Colors.textPrimary, marginBottom: 8 },
  required: { color: Colors.error },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.container,
    padding: 12,
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.textPrimary,
  },
  inputDisabled: { backgroundColor: Colors.surfaceMuted, color: Colors.textMuted },
  textArea: { minHeight: 80, paddingTop: 12 },
  helperText: { fontSize: 12, fontFamily: Fonts.body, color: Colors.textMuted, marginTop: 4 },
  genderButtons: { flexDirection: 'row', gap: 8 },
  genderButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: Radius.container,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  genderButtonActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  genderButtonText: { fontSize: 14, fontFamily: Fonts.bodySemiBold, color: Colors.textSecond },
  genderButtonTextActive: { color: '#fff', fontFamily: Fonts.bodySemiBold },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.accent,
    borderRadius: Radius.container,
    padding: 16,
    marginBottom: 20,
    elevation: 4,
    shadowColor: Colors.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontSize: 16, fontFamily: Fonts.bodySemiBold },
});
