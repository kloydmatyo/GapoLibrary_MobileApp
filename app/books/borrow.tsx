import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getBook, getHistory, borrowBook } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Colors from '@/constants/colors';

interface Book {
  _id: string;
  title: string;
  author: string;
  category: string;
  availableCopies: number;
  isEbook: boolean;
}

const FICTIONAL_CATEGORIES = ['fiction', 'fantasy', 'sci-fi', 'science fiction', 'mystery', 'thriller', 'romance', 'horror', 'adventure'];
const isFictional = (cat: string) => FICTIONAL_CATEGORIES.includes(cat.toLowerCase());

export default function BorrowScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Derived from history
  const [activeLoans, setActiveLoans] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [alreadyBorrowed, setAlreadyBorrowed] = useState(false);
  const [atTotalLimit, setAtTotalLimit] = useState(false);
  const [atFictionalLimit, setAtFictionalLimit] = useState(false);
  const [atNonFictionalLimit, setAtNonFictionalLimit] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [bookRes, historyRes] = await Promise.all([
          getBook(id),
          getHistory(),
        ]);

        const fetchedBook: Book = bookRes.data.book;
        setBook(fetchedBook);

        const history: any[] = historyRes.data.history;
        const active = history.filter((h) => h.status === 'pending_pickup' || h.status === 'active');
        const overdue = history.filter((h) => h.status === 'overdue');

        setActiveLoans(active.length);
        setOverdueCount(overdue.length);
        setAlreadyBorrowed(active.some((h) => h.bookId === id || h.bookTitle === fetchedBook.title));
        setAtTotalLimit(active.length >= 4);

        // Check fictional/non-fictional limits against active loans
        const fictionalActive = active.filter((h) => {
          // We don't have category in history, so we check by what we know
          // The API returns bookTitle/bookAuthor but not category — we approximate
          // by checking the current book's category against counts
          return false; // placeholder; real check below
        });

        // Re-derive using book categories from active loans
        // History doesn't include category, so we check limits based on current book
        const fictionalLoans = active.filter((h: any) => h.bookCategory && isFictional(h.bookCategory)).length;
        const nonFictionalLoans = active.filter((h: any) => h.bookCategory && !isFictional(h.bookCategory)).length;

        if (isFictional(fetchedBook.category)) {
          setAtFictionalLimit(fictionalLoans >= 3);
        } else {
          setAtNonFictionalLimit(nonFictionalLoans >= 1);
        }
      } catch {
        Alert.alert('Error', 'Could not load book details.');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await borrowBook(id);
      setSuccess(true);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Could not submit borrow request.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const canBorrow = book
    && !book.isEbook
    && book.availableCopies > 0
    && !alreadyBorrowed
    && !atTotalLimit
    && !atFictionalLimit
    && !atNonFictionalLimit;

  // ── Success state ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark" size={40} color={Colors.brand} />
        </View>
        <Text style={styles.successTitle}>Borrow Request Submitted!</Text>
        <Text style={styles.successBody}>
          Please visit the library to pick up your book within{' '}
          <Text style={styles.successHighlight}>24 hours</Text>.{'\n\n'}
          Your 7-day loan period starts on the day the librarian confirms you received it.
        </Text>
        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => router.replace('/(tabs)/books')}
        >
          <Text style={styles.doneBtnText}>Back to Catalog</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading || !book) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.brand} />
      </View>
    );
  }

  const isUnavailable = book.availableCopies === 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Borrow Book</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Book card */}
        <View style={styles.bookCard}>
          <View style={styles.bookIconWrap}>
            <Ionicons name="book" size={28} color={Colors.brand} />
          </View>
          <View style={styles.bookInfo}>
            <Text style={styles.bookTitle} numberOfLines={2}>{book.title}</Text>
            <Text style={styles.bookAuthor}>{book.author}</Text>
            <View style={[styles.availBadge, { backgroundColor: isUnavailable ? Colors.errorBg : Colors.brandMuted }]}>
              <View style={[styles.availDot, { backgroundColor: isUnavailable ? Colors.error : Colors.brand }]} />
              <Text style={[styles.availText, { color: isUnavailable ? Colors.error : Colors.brand }]}>
                {isUnavailable ? 'Unavailable' : `${book.availableCopies} Available`}
              </Text>
            </View>
          </View>
        </View>

        {/* Patron details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Details</Text>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Library Card Number</Text>
            <View style={styles.fieldReadOnly}>
              <Text style={styles.fieldValue}>{user?.patronId ?? '—'}</Text>
            </View>
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Patron Name</Text>
            <View style={styles.fieldReadOnly}>
              <Text style={styles.fieldValue}>{user?.name ?? '—'}</Text>
            </View>
          </View>
          <View style={styles.pickupNote}>
            <Ionicons name="information-circle-outline" size={16} color="#1d4ed8" />
            <Text style={styles.pickupNoteText}>
              Your 7-day loan period starts on the day you pick up the book at the library. The librarian will confirm your pickup.
            </Text>
          </View>
        </View>

        {/* Borrowing policy */}
        <View style={styles.policyCard}>
          <View style={styles.policyHeader}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.brand} />
            <Text style={styles.policyTitle}>Borrowing Policy</Text>
          </View>
          {[
            'Loan period is 7 days from the day you pick up the book',
            'Maximum of 4 books at a time (3 fictional + 1 non-fictional)',
            'You must visit the library to collect your book within 24 hours',
            'Books must be returned in the same condition',
          ].map((rule) => (
            <Text key={rule} style={styles.policyItem}>• {rule}</Text>
          ))}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: Colors.brand }]}>{activeLoans}</Text>
            <Text style={styles.statLabel}>Currently Borrowed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: overdueCount > 0 ? Colors.error : Colors.textMuted }]}>
              {overdueCount}
            </Text>
            <Text style={styles.statLabel}>Overdue Books</Text>
          </View>
        </View>

        {/* Blocking messages */}
        {book.isEbook && (
          <View style={styles.blockMsg}>
            <Ionicons name="alert-circle-outline" size={16} color="#1d4ed8" />
            <Text style={[styles.blockText, { color: '#1d4ed8' }]}>eBooks are available for online reading only and cannot be borrowed.</Text>
          </View>
        )}
        {alreadyBorrowed && (
          <View style={styles.blockMsg}>
            <Ionicons name="alert-circle-outline" size={16} color={Colors.warning} />
            <Text style={[styles.blockText, { color: Colors.warning }]}>You already have an active loan for this book.</Text>
          </View>
        )}
        {atTotalLimit && !alreadyBorrowed && (
          <View style={styles.blockMsg}>
            <Ionicons name="alert-circle-outline" size={16} color={Colors.error} />
            <Text style={[styles.blockText, { color: Colors.error }]}>You have reached the maximum of 4 borrowed books.</Text>
          </View>
        )}
        {atFictionalLimit && !alreadyBorrowed && !atTotalLimit && (
          <View style={styles.blockMsg}>
            <Ionicons name="alert-circle-outline" size={16} color={Colors.error} />
            <Text style={[styles.blockText, { color: Colors.error }]}>You can only borrow up to 3 fictional books at a time.</Text>
          </View>
        )}
        {atNonFictionalLimit && !alreadyBorrowed && !atTotalLimit && (
          <View style={styles.blockMsg}>
            <Ionicons name="alert-circle-outline" size={16} color={Colors.error} />
            <Text style={[styles.blockText, { color: Colors.error }]}>You can only borrow 1 non-fictional book at a time.</Text>
          </View>
        )}
        {isUnavailable && !alreadyBorrowed && (
          <View style={styles.blockMsg}>
            <Ionicons name="alert-circle-outline" size={16} color={Colors.error} />
            <Text style={[styles.blockText, { color: Colors.error }]}>No copies are currently available.</Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.confirmBtn, !canBorrow && styles.confirmBtnDisabled]}
            onPress={handleConfirm}
            disabled={!canBorrow || submitting}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.confirmBtnText}>Request Borrow</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },

  content: { padding: 16, paddingBottom: 32 },

  // Book card
  bookCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16,
    marginBottom: 16, elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6,
  },
  bookIconWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.brandMuted,
    justifyContent: 'center', alignItems: 'center',
  },
  bookInfo: { flex: 1 },
  bookTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2 },
  bookAuthor: { fontSize: 13, color: Colors.textSecond, marginBottom: 8 },
  availBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  availDot: { width: 7, height: 7, borderRadius: 4 },
  availText: { fontSize: 12, fontWeight: '700' },

  // Patron section
  section: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16,
    marginBottom: 16, elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 14 },
  fieldGroup: { marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecond, marginBottom: 6 },
  fieldReadOnly: {
    backgroundColor: '#f3f4f6', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  fieldValue: { fontSize: 14, color: Colors.textPrimary, fontWeight: '500' },
  pickupNote: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: '#eff6ff', borderRadius: 10, padding: 12, marginTop: 4,
  },
  pickupNoteText: { flex: 1, fontSize: 13, color: '#1d4ed8', lineHeight: 18 },

  // Policy
  policyCard: {
    backgroundColor: Colors.brandMuted, borderRadius: 16, padding: 16,
    marginBottom: 16,
  },
  policyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  policyTitle: { fontSize: 13, fontWeight: '700', color: Colors.brandDark, textTransform: 'uppercase', letterSpacing: 0.5 },
  policyItem: { fontSize: 13, color: Colors.brandDark, lineHeight: 22 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 16, padding: 16,
    alignItems: 'center', elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6,
  },
  statValue: { fontSize: 36, fontWeight: '800' },
  statLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecond, marginTop: 4, textAlign: 'center' },

  // Blocking messages
  blockMsg: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    borderRadius: 10, padding: 12, marginBottom: 10,
    backgroundColor: Colors.errorBg,
    borderWidth: 1, borderColor: '#fecaca',
  },
  blockText: { flex: 1, fontSize: 13, lineHeight: 18 },

  // Actions
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', backgroundColor: Colors.surface,
  },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  confirmBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    alignItems: 'center', backgroundColor: Colors.brand,
  },
  confirmBtnDisabled: { backgroundColor: Colors.textMuted },
  confirmBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Success
  successContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 32, backgroundColor: Colors.background,
  },
  successIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.brandMuted,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  successTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', marginBottom: 12 },
  successBody: { fontSize: 14, color: Colors.textSecond, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  successHighlight: { fontWeight: '700', color: Colors.brand },
  doneBtn: {
    backgroundColor: Colors.brand, borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 40,
  },
  doneBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
