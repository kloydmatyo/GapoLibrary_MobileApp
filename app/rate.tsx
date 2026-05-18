import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getCirculationHistory, getMyRatings } from '@/lib/api';
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

export default function RateScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<RatableTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user) {
      loadTransactions();
    } else if (!authLoading && !user) {
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

      const ratableTransactions: RatableTransaction[] = [];

      history.forEach((tx: Transaction) => {
        const isCompleted = Boolean(tx.returnDate || tx.pickupConfirmedAt || tx.status === 'returned');
        if (!isCompleted) return;

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

      ratableTransactions.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());

      setTransactions(ratableTransactions);
    } catch (err: any) {
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

  if (authLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={Colors.brand} size="large" />
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

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
            <Text style={styles.sectionLabel}>Select a transaction</Text>
            {transactions.map((tx) => {
              return (
                <TouchableOpacity
                  key={`${tx._id}-${tx.staffId}-${tx.transactionType}`}
                  style={[
                    styles.transactionCard,
                    tx.alreadyRated && styles.transactionCardDisabled,
                  ]}
                  onPress={() => {
                    if (tx.alreadyRated) return;
                    const serialized = encodeURIComponent(JSON.stringify(tx));
                    router.push(`/rate/${tx._id}?tx=${serialized}` as any);
                  }}
                  disabled={tx.alreadyRated}
                >
                  <View style={styles.transactionHeader}>
                    <View style={styles.bookInfo}>
                      <Text style={styles.bookTitle} numberOfLines={1}>{tx.bookTitle}</Text>
                      <Text style={styles.bookAuthor} numberOfLines={1}>{tx.bookAuthor}</Text>
                    </View>
                    <View />
                  </View>

                  <View style={styles.transactionDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="person-outline" size={16} color={Colors.textSecond} />
                      <Text style={styles.detailText}>{tx.staffName}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name={tx.transactionType === 'pickup' ? 'arrow-down-outline' : 'arrow-up-outline'} size={16} color={Colors.textSecond} />
                      <Text style={styles.detailText}>{tx.transactionType === 'pickup' ? 'Pickup' : 'Return'} • {formatDate(tx.transactionDate)}</Text>
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
      </ScrollView>
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
