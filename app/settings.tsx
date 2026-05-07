import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Switch, ActivityIndicator, Alert, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '@/lib/api';
import { getPreferences, savePreferences, uploadProfileImage, deleteProfileImage } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Colors from '@/constants/colors';

// ── Types ──────────────────────────────────────────────────────────────────

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  gender: string;
  age?: number;
}

interface Prefs {
  favoriteCategories: string[];
  notifications: { overdue: boolean; reservationReady: boolean; pickupReminder: boolean };
}

const DEFAULT_PREFS: Prefs = {
  favoriteCategories: [],
  notifications: { overdue: true, reservationReady: true, pickupReminder: true },
};

const ALL_CATEGORIES = [
  'Fiction', 'Non-Fiction', 'Science', 'History', 'Technology',
  'Biography', 'Self-Help', 'Mathematics', 'Literature', 'Psychology',
  'Economics', 'Language', 'Biology', 'Computer Science',
];

// ── Helpers ────────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function ToggleRow({ label, description, value, onChange }: {
  label: string; description: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleText}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleDesc}>{description}</Text>
      </View>
      <Switch value={value} onValueChange={onChange}
        trackColor={{ false: Colors.border, true: Colors.brand }} thumbColor="#fff" />
    </View>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);
  const [mongoId, setMongoId] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [profile, setProfile] = useState<UserProfile>({
    firstName: '', lastName: '', email: '', phone: '', address: '', gender: '',
  });
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);

  useEffect(() => {
    Promise.all([
      api.get('/user/profile'),
      getPreferences(),
    ]).then(([profileRes, prefsRes]) => {
      const u = profileRes.data.user;
      setMongoId(u._id || '');
      setProfileImage(u.profileImage || null);
      setProfile({
        firstName: u.firstName || '',
        lastName: u.lastName || '',
        email: u.email || '',
        phone: u.phone || '',
        address: u.address || '',
        gender: u.gender || '',
        age: u.age,
      });
      setPrefs(prefsRes.data.preferences ?? DEFAULT_PREFS);
    }).catch(() => Alert.alert('Error', 'Could not load settings.'))
      .finally(() => setLoading(false));
  }, []);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (result.canceled || !result.assets[0].base64) return;

    const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
    setUploadingImage(true);
    try {
      await uploadProfileImage(mongoId, base64);
      setProfileImage(base64);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || 'Could not upload photo.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    Alert.alert('Remove Photo', 'Are you sure you want to remove your profile photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          setUploadingImage(true);
          try {
            await deleteProfileImage(mongoId);
            setProfileImage(null);
          } catch {
            Alert.alert('Error', 'Could not remove photo.');
          } finally {
            setUploadingImage(false);
          }
        },
      },
    ]);
  };

  const handleSaveProfile = async () => {
    if (!profile.firstName.trim() || !profile.lastName.trim()) {
      Alert.alert('Validation Error', 'First and last name are required.');
      return;
    }
    setSavingProfile(true);
    try {
      await api.put('/user/profile', {
        firstName: profile.firstName.trim(),
        lastName: profile.lastName.trim(),
        phone: profile.phone?.trim() || undefined,
        address: profile.address?.trim() || undefined,
        gender: profile.gender?.trim() || undefined,
        age: profile.age || undefined,
      });
      Alert.alert('Saved', 'Profile updated successfully.');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || 'Could not update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const toggleCategory = (cat: string) => {
    setPrefs((p) => {
      const has = p.favoriteCategories.includes(cat);
      if (!has && p.favoriteCategories.length >= 5) return p;
      return {
        ...p,
        favoriteCategories: has
          ? p.favoriteCategories.filter((c) => c !== cat)
          : [...p.favoriteCategories, cat],
      };
    });
    setPrefsSaved(false);
  };

  const setNotif = (key: keyof Prefs['notifications'], val: boolean) => {
    setPrefs((p) => ({ ...p, notifications: { ...p.notifications, [key]: val } }));
    setPrefsSaved(false);
  };

  const handleSavePrefs = async () => {
    setSavingPrefs(true);
    try {
      await savePreferences({ favoriteCategories: prefs.favoriteCategories, notifications: prefs.notifications });
      setPrefsSaved(true);
    } catch {
      Alert.alert('Error', 'Could not save preferences.');
    } finally {
      setSavingPrefs(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={Colors.brand} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* ── Profile ── */}
        <SectionHeader title="Profile" />

        <View style={styles.avatarRow}>
          <TouchableOpacity style={styles.avatarWrap} onPress={handlePickImage} disabled={uploadingImage}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {profile.firstName.charAt(0).toUpperCase()}{profile.lastName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              {uploadingImage
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="camera" size={14} color="#fff" />}
            </View>
          </TouchableOpacity>
          <View style={styles.avatarMeta}>
            <Text style={styles.avatarName}>{profile.firstName} {profile.lastName}</Text>
            <Text style={styles.avatarSub}>{user?.patronId}</Text>
            <View style={styles.avatarActions}>
              <TouchableOpacity style={styles.avatarBtn} onPress={handlePickImage} disabled={uploadingImage}>
                <Text style={styles.avatarBtnText}>Change Photo</Text>
              </TouchableOpacity>
              {profileImage && (
                <TouchableOpacity style={[styles.avatarBtn, styles.avatarBtnDanger]} onPress={handleRemoveImage} disabled={uploadingImage}>
                  <Text style={[styles.avatarBtnText, { color: Colors.error }]}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Field label="First Name" required>
            <TextInput style={styles.input} value={profile.firstName}
              onChangeText={(t) => setProfile({ ...profile, firstName: t })}
              placeholder="First name" placeholderTextColor={Colors.textMuted} />
          </Field>
          <Divider />
          <Field label="Last Name" required>
            <TextInput style={styles.input} value={profile.lastName}
              onChangeText={(t) => setProfile({ ...profile, lastName: t })}
              placeholder="Last name" placeholderTextColor={Colors.textMuted} />
          </Field>
          <Divider />
          <Field label="Email">
            <TextInput style={[styles.input, styles.inputDisabled]} value={profile.email} editable={false} />
            <Text style={styles.helperText}>Email cannot be changed</Text>
          </Field>
          <Divider />
          <Field label="Phone">
            <TextInput style={styles.input} value={profile.phone}
              onChangeText={(t) => setProfile({ ...profile, phone: t })}
              placeholder="Phone number" keyboardType="phone-pad" placeholderTextColor={Colors.textMuted} />
          </Field>
          <Divider />
          <Field label="Address">
            <TextInput style={[styles.input, styles.textArea]} value={profile.address}
              onChangeText={(t) => setProfile({ ...profile, address: t })}
              placeholder="Address" multiline numberOfLines={3}
              textAlignVertical="top" placeholderTextColor={Colors.textMuted} />
          </Field>
          <Divider />
          <Field label="Gender">
            <View style={styles.genderRow}>
              {['Male', 'Female', 'Other'].map((g) => (
                <TouchableOpacity key={g}
                  style={[styles.genderBtn, profile.gender === g && styles.genderBtnActive]}
                  onPress={() => setProfile({ ...profile, gender: g })}>
                  <Text style={[styles.genderBtnText, profile.gender === g && styles.genderBtnTextActive]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Field>
          <Divider />
          <Field label="Age">
            <TextInput style={styles.input}
              value={profile.age?.toString() || ''}
              onChangeText={(t) => setProfile({ ...profile, age: parseInt(t) || undefined })}
              placeholder="Age" keyboardType="number-pad" placeholderTextColor={Colors.textMuted} />
          </Field>
        </View>

        <TouchableOpacity style={[styles.saveBtn, savingProfile && styles.saveBtnDisabled]}
          onPress={handleSaveProfile} disabled={savingProfile}>
          {savingProfile
            ? <ActivityIndicator color="#fff" />
            : <><Ionicons name="checkmark-circle-outline" size={20} color="#fff" /><Text style={styles.saveBtnText}>Save Profile</Text></>}
        </TouchableOpacity>

        {/* ── Favorite Categories ── */}
        <SectionHeader title="Favorite Categories" />
        <Text style={styles.sectionSub}>Pick up to 5 — we'll surface these on your home screen.</Text>

        <View style={styles.chips}>
          {ALL_CATEGORIES.map((cat) => {
            const selected = prefs.favoriteCategories.includes(cat);
            const maxed = prefs.favoriteCategories.length >= 5 && !selected;
            return (
              <TouchableOpacity key={cat}
                style={[styles.chip, selected && styles.chipSelected, maxed && styles.chipDisabled]}
                onPress={() => toggleCategory(cat)} disabled={maxed}>
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {prefs.favoriteCategories.length > 0 && (
          <Text style={styles.chipCount}>{prefs.favoriteCategories.length}/5 selected</Text>
        )}

        {/* ── Notifications ── */}
        <SectionHeader title="Notification Preferences" />

        <View style={styles.card}>
          <ToggleRow label="Overdue reminders" description="Notified when a book is past its due date"
            value={prefs.notifications.overdue} onChange={(v) => setNotif('overdue', v)} />
          <Divider />
          <ToggleRow label="Reservation ready" description="Notified when your reserved book is available"
            value={prefs.notifications.reservationReady} onChange={(v) => setNotif('reservationReady', v)} />
          <Divider />
          <ToggleRow label="Pickup reminders" description="Reminded to pick up before expiry"
            value={prefs.notifications.pickupReminder} onChange={(v) => setNotif('pickupReminder', v)} />
        </View>

        <TouchableOpacity style={[styles.saveBtn, savingPrefs && styles.saveBtnDisabled]}
          onPress={handleSavePrefs} disabled={savingPrefs}>
          {savingPrefs
            ? <ActivityIndicator color="#fff" />
            : <><Ionicons name={prefsSaved ? 'checkmark-circle' : 'save-outline'} size={20} color="#fff" />
                <Text style={styles.saveBtnText}>{prefsSaved ? 'Saved!' : 'Save Preferences'}</Text></>}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}{required && <Text style={{ color: Colors.error }}> *</Text>}</Text>
      {children}
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border, elevation: 2,
  },
  backBtn: { padding: 4, marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  content: { padding: 20, paddingBottom: 40 },

  // Section
  sectionTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, marginTop: 24, marginBottom: 12 },
  sectionSub: { fontSize: 13, color: Colors.textSecond, marginBottom: 12, marginTop: -8 },

  // Avatar row
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.brand, justifyContent: 'center', alignItems: 'center',
  },
  avatarImg: { width: 64, height: 64, borderRadius: 32 },
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.brand, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: Colors.background,
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  avatarMeta: { flex: 1 },
  avatarName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  avatarSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  avatarActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  avatarBtn: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  avatarBtnDanger: { borderColor: Colors.error },
  avatarBtnText: { fontSize: 12, fontWeight: '600', color: Colors.brand },

  // Card
  card: {
    backgroundColor: Colors.surface, borderRadius: 14,
    paddingHorizontal: 16, elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4,
  },
  divider: { height: 1, backgroundColor: Colors.border },
  field: { paddingVertical: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecond, marginBottom: 6 },

  // Inputs
  input: {
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: Colors.textPrimary,
  },
  inputDisabled: { backgroundColor: '#f3f4f6', color: Colors.textMuted },
  textArea: { minHeight: 72, paddingTop: 10, textAlignVertical: 'top' },
  helperText: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },

  // Gender
  genderRow: { flexDirection: 'row', gap: 8 },
  genderBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background, alignItems: 'center',
  },
  genderBtnActive: { backgroundColor: Colors.brand, borderColor: Colors.brand },
  genderBtnText: { fontSize: 13, fontWeight: '600', color: Colors.textSecond },
  genderBtnTextActive: { color: '#fff' },

  // Category chips
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  chipSelected: { backgroundColor: Colors.brand, borderColor: Colors.brand },
  chipDisabled: { opacity: 0.4 },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  chipTextSelected: { color: '#fff' },
  chipCount: { fontSize: 13, fontWeight: '700', color: Colors.brand, marginBottom: 8 },

  // Toggle
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  toggleText: { flex: 1 },
  toggleLabel: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  toggleDesc: { fontSize: 12, color: Colors.textSecond, marginTop: 2 },

  // Save button
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.brand, borderRadius: 12, padding: 14, marginTop: 16,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
