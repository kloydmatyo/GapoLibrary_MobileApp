import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getStaffList, submitRating } from '@/lib/api';
import Colors from '@/constants/colors';

interface StaffMember {
  patronId: string;
  name: string;
  role: string;
}

const SCORE_LABELS: Record<number, string> = {
  1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very Good', 5: 'Excellent',
};

function StarRow({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity key={star} onPress={() => onChange(star)} style={styles.starBtn}>
          <Ionicons
            name={star <= value ? 'star' : 'star-outline'}
            size={36}
            color={star <= value ? '#f59e0b' : Colors.border}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function RateScreen() {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<StaffMember | null>(null);
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    getStaffList()
      .then((res) => setStaff(res.data.staff || []))
      .catch(() => Alert.alert('Error', 'Could not load librarians.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    if (!selected || score === 0) {
      Alert.alert('Incomplete', 'Please select a librarian and give a star rating.');
      return;
    }
    setSubmitting(true);
    try {
      await submitRating(selected.patronId, score, comment.trim() || undefined);
      setSubmitted(true);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to submit rating.');
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setSelected(null);
    setScore(0);
    setComment('');
    setSubmitted(false);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rate a Librarian</Text>
        <View style={{ width: 40 }} />
      </View>

      {submitted ? (
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={64} color={Colors.brand} />
          </View>
          <Text style={styles.successTitle}>Thank you!</Text>
          <Text style={styles.successText}>
            Your rating has been submitted anonymously. Your identity is never stored.
          </Text>
          <TouchableOpacity style={styles.rateAnotherBtn} onPress={reset}>
            <Text style={styles.rateAnotherText}>Rate another librarian</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Anonymous notice */}
          <View style={styles.notice}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#3b82f6" />
            <Text style={styles.noticeText}>
              Fully anonymous — no personal information is linked to your submission.
            </Text>
          </View>

          {/* Select librarian */}
          <Text style={styles.sectionLabel}>Select a librarian</Text>
          {loading ? (
            <ActivityIndicator color={Colors.brand} style={{ marginVertical: 24 }} />
          ) : (
            staff.map((s) => {
              const isSelected = selected?.patronId === s.patronId;
              const initials = s.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
              return (
                <TouchableOpacity
                  key={s.patronId}
                  style={[styles.staffCard, isSelected && styles.staffCardSelected]}
                  onPress={() => { setSelected(s); setScore(0); }}
                >
                  <View style={[styles.avatar, isSelected && styles.avatarSelected]}>
                    <Text style={[styles.avatarText, isSelected && styles.avatarTextSelected]}>
                      {initials}
                    </Text>
                  </View>
                  <View style={styles.staffInfo}>
                    <Text style={styles.staffName}>{s.name}</Text>
                    <Text style={styles.staffRole}>{s.role}</Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={24} color={Colors.brand} />
                  )}
                </TouchableOpacity>
              );
            })
          )}

          {/* Star rating */}
          {selected && (
            <>
              <Text style={styles.sectionLabel}>
                How would you rate {selected.name.split(' ')[0]}?
              </Text>
              <StarRow value={score} onChange={setScore} />
              {score > 0 && (
                <Text style={styles.scoreLabel}>{SCORE_LABELS[score]}</Text>
              )}
            </>
          )}

          {/* Comment */}
          {selected && score > 0 && (
            <>
              <Text style={styles.sectionLabel}>
                Comment <Text style={styles.optional}>(optional)</Text>
              </Text>
              <TextInput
                style={styles.commentInput}
                value={comment}
                onChangeText={setComment}
                placeholder="Share your experience..."
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={4}
                maxLength={500}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{comment.length}/500</Text>
            </>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, (!selected || score === 0 || submitting) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!selected || score === 0 || submitting}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitText}>Submit Rating Anonymously</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

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
  notice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#eff6ff', borderRadius: 12, padding: 14, marginBottom: 24,
  },
  noticeText: { flex: 1, fontSize: 13, color: '#1e40af', lineHeight: 18, fontWeight: '500' },
  sectionLabel: {
    fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12, marginTop: 8,
  },
  staffCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: Colors.border,
  },
  staffCardSelected: {
    borderColor: Colors.brand, backgroundColor: Colors.brandMuted,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: Colors.brandLight, justifyContent: 'center', alignItems: 'center',
  },
  avatarSelected: { backgroundColor: Colors.brand },
  avatarText: { fontSize: 15, fontWeight: '800', color: Colors.brand },
  avatarTextSelected: { color: '#fff' },
  staffInfo: { flex: 1 },
  staffName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  staffRole: { fontSize: 13, color: Colors.textSecond, marginTop: 2, textTransform: 'capitalize' },
  starRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  starBtn: { padding: 4 },
  scoreLabel: { fontSize: 14, fontWeight: '700', color: '#d97706', marginBottom: 16 },
  optional: { fontWeight: '400', color: Colors.textMuted },
  commentInput: {
    backgroundColor: Colors.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
    fontSize: 14, color: Colors.textPrimary, minHeight: 100, marginBottom: 4,
  },
  charCount: { fontSize: 12, color: Colors.textMuted, textAlign: 'right', marginBottom: 24 },
  submitBtn: {
    backgroundColor: Colors.brand, borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  successContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  successIcon: { marginBottom: 16 },
  successTitle: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8 },
  successText: {
    fontSize: 14, color: Colors.textSecond, textAlign: 'center', lineHeight: 20, marginBottom: 32,
  },
  rateAnotherBtn: {
    backgroundColor: Colors.brand, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 14,
  },
  rateAnotherText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
