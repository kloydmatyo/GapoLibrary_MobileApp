import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getPreferences, savePreferences } from '@/lib/api';
import Colors from '@/constants/colors';

const ALL_CATEGORIES = [
  'Fiction', 'Non-Fiction', 'Science', 'History', 'Technology',
  'Biography', 'Self-Help', 'Mathematics', 'Literature', 'Psychology',
  'Economics', 'Language', 'Biology', 'Computer Science',
];

interface Prefs {
  favoriteCategories: string[];
  notifications: {
    overdue: boolean;
    reservationReady: boolean;
    pickupReminder: boolean;
  };
}

const DEFAULT_PREFS: Prefs = {
  favoriteCategories: [],
  notifications: { overdue: true, reservationReady: true, pickupReminder: true },
};

export default function PreferencesScreen() {
  const router = useRouter();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getPreferences()
      .then((res) => setPrefs(res.data.preferences ?? DEFAULT_PREFS))
      .catch(() => Alert.alert('Error', 'Could not load preferences.'))
      .finally(() => setLoading(false));
  }, []);

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
    setSaved(false);
  };

  const setNotif = (key: keyof Prefs['notifications'], val: boolean) => {
    setPrefs((p) => ({ ...p, notifications: { ...p.notifications, [key]: val } }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await savePreferences({
        favoriteCategories: prefs.favoriteCategories,
        notifications: prefs.notifications,
      });
      setSaved(true);
    } catch {
      Alert.alert('Error', 'Could not save preferences.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Preferences</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} size="large" color={Colors.brand} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>

          {/* Favorite Categories */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Favorite Categories</Text>
            <Text style={styles.sectionSub}>
              Pick up to 5 — we'll surface these books on your home screen.
            </Text>
            <View style={styles.chips}>
              {ALL_CATEGORIES.map((cat) => {
                const selected = prefs.favoriteCategories.includes(cat);
                const maxed = prefs.favoriteCategories.length >= 5 && !selected;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.chip, selected && styles.chipSelected, maxed && styles.chipDisabled]}
                    onPress={() => toggleCategory(cat)}
                    disabled={maxed}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected, maxed && styles.chipTextDisabled]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {prefs.favoriteCategories.length > 0 && (
              <Text style={styles.selectionCount}>
                {prefs.favoriteCategories.length}/5 selected
              </Text>
            )}
          </View>

          {/* Notification Preferences */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notification Preferences</Text>
            <Text style={styles.sectionSub}>Choose which notifications you want to receive.</Text>

            <View style={styles.card}>
              <ToggleRow
                label="Overdue reminders"
                description="Get notified when a book is past its due date"
                value={prefs.notifications.overdue}
                onChange={(v) => setNotif('overdue', v)}
              />
              <View style={styles.divider} />
              <ToggleRow
                label="Reservation ready"
                description="Get notified when your reserved book is available"
                value={prefs.notifications.reservationReady}
                onChange={(v) => setNotif('reservationReady', v)}
              />
              <View style={styles.divider} />
              <ToggleRow
                label="Pickup reminders"
                description="Get reminded to pick up your book before it expires"
                value={prefs.notifications.pickupReminder}
                onChange={(v) => setNotif('pickupReminder', v)}
              />
            </View>
          </View>

          {/* Save button */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name={saved ? 'checkmark-circle' : 'save-outline'} size={20} color="#fff" />
                <Text style={styles.saveBtnText}>{saved ? 'Saved!' : 'Save Preferences'}</Text>
              </>
            )}
          </TouchableOpacity>

        </ScrollView>
      )}
    </View>
  );
}

function ToggleRow({
  label, description, value, onChange,
}: {
  label: string; description: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <View style={toggleStyles.row}>
      <View style={toggleStyles.text}>
        <Text style={toggleStyles.label}>{label}</Text>
        <Text style={toggleStyles.desc}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: Colors.border, true: Colors.brand }}
        thumbColor="#fff"
      />
    </View>
  );
}

const toggleStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14,
  },
  text: { flex: 1 },
  label: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  desc: { fontSize: 12, color: Colors.textSecond, marginTop: 2 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    elevation: 2,
  },
  backBtn: { padding: 4, marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  content: { padding: 20, paddingBottom: 40 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  sectionSub: { fontSize: 13, color: Colors.textSecond, marginBottom: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipSelected: { backgroundColor: Colors.brand, borderColor: Colors.brand },
  chipDisabled: { opacity: 0.4 },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  chipTextSelected: { color: '#fff' },
  chipTextDisabled: { color: Colors.textMuted },
  selectionCount: {
    marginTop: 10, fontSize: 13, fontWeight: '700', color: Colors.brand,
  },
  card: {
    backgroundColor: Colors.surface, borderRadius: 14, paddingHorizontal: 16,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4,
  },
  divider: { height: 1, backgroundColor: Colors.border },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.brand, borderRadius: 12, padding: 16, marginTop: 4,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
