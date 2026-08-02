import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ReactionRow, { SCORE_LABELS } from '@/components/StarRow';
import { submitRating } from '@/lib/api';
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

export default function RatingScreen() {
  const { id, tx } = useLocalSearchParams<{ id: string; tx: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const transaction = useMemo(() => {
    if (!tx) return null;
    try {
      return JSON.parse(decodeURIComponent(tx));
    } catch (e) {
      return null;
    }
  }, [tx]);

  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  if (authLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  if (!transaction) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rate</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateTitle}>Invalid transaction</Text>
          <Text style={styles.emptyStateText}>Could not load transaction data.</Text>
        </View>
      </View>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleSubmit = async () => {
    const normalizedScore = score >= 1 && score <= 3 ? score : 0;
    if (normalizedScore === 0) {
      Alert.alert('Incomplete', 'Please select a reaction.');
      return;
    }
    setSubmitting(true);
    try {
      await submitRating(transaction.staffId, normalizedScore, transaction._id, comment.trim() || undefined);
      setSubmitted(true);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to submit rating.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/rate')}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rate a Librarian</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={64} color={Colors.accent} />
          </View>
          <Text style={styles.successTitle}>Thank you!</Text>
          <Text style={styles.successText}>Your rating has been submitted anonymously.</Text>
          <TouchableOpacity style={styles.submitBtn} onPress={() => router.replace('/rate')}>
            <Text style={styles.submitText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rate a Librarian</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.bookTitle}>{transaction.bookTitle}</Text>
          <Text style={styles.bookAuthor}>{transaction.bookAuthor}</Text>
          <View style={{ height: 8 }} />
          <Text style={styles.detailText}>{transaction.staffName}</Text>
          <Text style={styles.detailText}>
            {transaction.transactionType === 'pickup' ? 'Pickup' : 'Return'} •{' '}
            {formatDate(transaction.transactionDate)}
          </Text>
        </View>

        <Text style={styles.sectionLabel}>Your rating</Text>
  <ReactionRow value={score} onChange={setScore} />
        {score > 0 && <Text style={styles.scoreLabel}>{SCORE_LABELS[score]}</Text>}

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

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Submit Rating Anonymously</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { justifyContent: 'center', alignItems: 'center' },
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
  backBtn: { padding: 4, marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 17, fontFamily: Fonts.heading, color: Colors.textPrimary },
  content: { padding: 20, paddingBottom: 40 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.container,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...cardShadow,
  },
  bookTitle: { fontSize: 16, fontFamily: Fonts.bodySemiBold, color: Colors.textPrimary },
  bookAuthor: { fontSize: 14, fontFamily: Fonts.body, color: Colors.textSecond, marginTop: 4 },
  detailText: { fontSize: 13, fontFamily: Fonts.body, color: Colors.textSecond },
  sectionLabel: {
    fontSize: 13,
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scoreLabel: { fontSize: 14, fontFamily: Fonts.bodySemiBold, color: Colors.accent, marginBottom: 12 },
  optional: { fontFamily: Fonts.body, color: Colors.textMuted },
  commentInput: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.container,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.textPrimary,
    minHeight: 100,
    marginBottom: 4,
  },
  charCount: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    textAlign: 'right',
    marginBottom: 24,
  },
  submitBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.container,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    elevation: 4,
    shadowColor: Colors.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitText: { color: '#fff', fontSize: 16, fontFamily: Fonts.bodySemiBold },
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  successIcon: { marginBottom: 16 },
  successTitle: { fontSize: 24, fontFamily: Fonts.heading, color: Colors.textPrimary, marginBottom: 8 },
  successText: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.textSecond,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  emptyStateContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, paddingHorizontal: 32 },
  emptyStateTitle: {
    fontSize: 18,
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
    marginTop: 12,
    marginBottom: 6,
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.textSecond,
    textAlign: 'center',
    lineHeight: 20,
  },
});
