import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getCirculationHistory, getMyRatings, submitRating } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Colors from '@/constants/colors';

interface Transaction {
  _id: string;
  bookTitle: string;
  bookAuthor: string;
  confirmedBy?: string;
  returnedTo?: string;
  pickupConfirmedAt?: string;
  returnDate?: string;
  status: string;
  checkoutDate: string;
  pickupConfirmedBy?: string;
  checkedInBy?: string;
  checkedOutBy?: string;
}

interface RatableTransaction extends Transaction {
  staffId: string;
  staffName: string;
  transactionType: 'pickup' | 'return';
  transactionDate: string;
  alreadyRated: boolean;
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
  const { user, loading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<RatableTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<RatableTransaction | null>(null);
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // Only load transactions if user is authenticated
    if (!authLoading && user) {
      loadTransactions();
    } else if (!authLoading && !user) {
      // User is not authenticated, redirect to login
      router.replace('/login');
    }
  }, [authLoading, user]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const [historyRes, ratingsRes] = await Promise.all([
        getCirculationHistory(),
        getMyRatings(),
      ]);

      const history = historyRes.data.history || [];
      const ratedTransactionIds = new Set(ratingsRes.data.ratedTransactionIds || []);

      // Filter for completed transactions with staff involvement
      const ratableTransactions: RatableTransaction[] = [];

      history.forEach((tx: Transaction) => {
        // Check if transaction is completed
        const isCompleted = Boolean(tx.returnDate || tx.pickupConfirmedAt || tx.status === 'returned');
        if (!isCompleted) return;

        // Check for pickup transaction
        if (tx.pickupConfirmedBy) {
          const alreadyRated = ratedTransactionIds.has(tx._id);
          ratableTransactions.push({
            ...tx,
            staffId: tx.pickupConfirmedBy,
            staffName: tx.confirmedBy || 'Unknown Staff',
            transactionType: 'pickup',
            transactionDate: tx.pickupConfirmedAt || tx.checkoutDate,
            alreadyRated,
          });
        }

        // Check for return transaction (only if different from pickup staff)
        if (tx.checkedInBy && tx.checkedInBy !== tx.pickupConfirmedBy) {
          const alreadyRated = ratedTransactionIds.has(tx._id);
          ratableTransactions.push({
            ...tx,
            staffId: tx.checkedInBy,
            staffName: tx.returnedTo || 'Unknown Staff',
            transactionType: 'return',
            transactionDate: tx.returnDate,
            alreadyRated,
          });
        }
      });

      // Sort by date descending (most recent first)
      ratableTransactions.sort(
        (a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
      );

      setTransactions(ratableTransactions);
    } catch (err: any) {
      // Check if it's a 401 error
      if (err.response?.status === 401) {
        Alert.alert('Session Expired', 'Please log in again to continue.');
        router.replace('/login');
      } else {
        Alert.alert('Error', 'Could not load transactions. Please try again.');
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleSubmit = async () => {
    if (!selected || score === 0) {
      Alert.alert('Incomplete', 'Please select a transaction and give a star rating.');
      return;
    }
    setSubmitting(true);
    try {
      await submitRating(selected.staffId, score, selected._id, comment.trim() || undefined);
      setSubmitted(true);
    } catch (err: any) {
      if (err.response?.status === 401) {
        Alert.alert('Session Expired', 'Please log in again to continue.');
        router.replace('/login');
      } else {
        Alert.alert('Error', err?.response?.data?.error || 'Failed to submit rating.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setSelected(null);
    setScore(0);
    setComment('');
    setSubmitted(false);
    loadTransactions();
  };

  // Show loading while auth is being determined
  if (authLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={Colors.brand} size="large" />
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
            <Text style={styles.rateAnotherText}>Rate another transaction</Text>
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

          {loading ? (
            <ActivityIndicator color={Colors.brand} style={{ marginVertical: 24 }} />
          ) : transactions.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="checkmark-done-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyStateTitle}>No transactions to rate</Text>
              <Text style={styles.emptyStateText}>
                You can rate librarians once you complete a transaction with the library.
              </Text>
            </View>
          ) : (
            <>
              {/* Select transaction */}
              <Text style={styles.sectionLabel}>Select a transaction</Text>
              {transactions.map((tx) => {
                const isSelected = selected?._id === tx._id;
                return (
                  <TouchableOpacity
                    key={`${tx._id}-${tx.staffId}-${tx.transactionType}`}
                    style={[
                      styles.transactionCard,
                      isSelected && styles.transactionCardSelected,
                      tx.alreadyRated && styles.transactionCardDisabled,
                    ]}
                    onPress={() => !tx.alreadyRated && setSelected(tx)}
                    disabled={tx.alreadyRated}
                  >
                    <View style={styles.transactionHeader}>
                      <View style={styles.bookInfo}>
                        <Text style={styles.bookTitle} numberOfLines={1}>
                          {tx.bookTitle}
                        </Text>
                        <Text style={styles.bookAuthor} numberOfLines={1}>
                          {tx.bookAuthor}
                        </Text>
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={24} color={Colors.brand} />
                      )}
                    </View>

                    <View style={styles.transactionDetails}>
                      <View style={styles.detailRow}>
                        <Ionicons name="person-outline" size={16} color={Colors.textSecond} />
                        <Text style={styles.detailText}>{tx.staffName}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Ionicons
                          name={tx.transactionType === 'pickup' ? 'arrow-down-outline' : 'arrow-up-outline'}
                          size={16}
                          color={Colors.textSecond}
                        />
                        <Text style={styles.detailText}>
                          {tx.transactionType === 'pickup' ? 'Pickup' : 'Return'} •{' '}
                          {formatDate(tx.transactionDate)}
                        </Text>
                      </View>
                    </View>

                    {tx.alreadyRated && (
                      <View style={styles.ratedBadge}>
                        <Ionicons name="star" size={12} color="#fff" />
                        <Text style={styles.ratedBadgeText}>Already rated</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {/* Star rating */}
          {selected && !transactions.every((t) => t.alreadyRated) && (
            <>
              <Text style={styles.sectionLabel}>
                How would you rate {selected.staffName.split(' ')[0]}?
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
  transactionCard: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: Colors.border,
    opacity: 1,
  },
  transactionCardSelected: {
    borderColor: Colors.brand, backgroundColor: Colors.brandMuted,
  },
  transactionCardDisabled: {
    opacity: 0.5,
  },
  transactionHeader: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    marginBottom: 10,
  },
  bookInfo: { flex: 1, marginRight: 8 },
  bookTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  bookAuthor: { fontSize: 13, color: Colors.textSecond, marginTop: 2 },
  transactionDetails: { gap: 6 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 13, color: Colors.textSecond },
  ratedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#10b981', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 6, alignSelf: 'flex-start', marginTop: 8,
  },
  ratedBadgeText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  emptyStateContainer: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginTop: 12, marginBottom: 6,
  },
  emptyStateText: {
    fontSize: 14, color: Colors.textSecond, textAlign: 'center', lineHeight: 20,
  },
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
