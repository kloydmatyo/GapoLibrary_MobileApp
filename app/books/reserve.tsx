import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getBook, getReservations, createReservation, cancelReservation } from '@/lib/api';
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

interface Book {
  _id: string;
  title: string;
  author: string;
  availableCopies: number;
}

interface Reservation {
  _id: string;
  userId: string;
  bookId: string;
  queuePosition: number;
  status: string;
}

export default function ReserveScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [book, setBook] = useState<Book | null>(null);
  const [queueLength, setQueueLength] = useState(0);
  const [myReservation, setMyReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [bookRes, myRes] = await Promise.all([
          getBook(id),
          getReservations(),          // current user's reservations (no bookId = user-scoped)
        ]);

        setBook(bookRes.data.book);
        setQueueLength(Number(bookRes.data.queueLength ?? 0));

        const mine = (myRes.data.reservations ?? []).find(
          (r: Reservation) => r.bookId === id && (r.status === 'waiting' || r.status === 'notified')
        );
        setMyReservation(mine ?? null);
      } catch {
        Alert.alert('Error', 'Could not load reservation details.');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const handleJoinQueue = async () => {
    setSubmitting(true);
    try {
      const res = await createReservation(id);
      const position = res.data.queuePosition;
      setMyReservation({ ...res.data.reservation, queuePosition: position });
      setQueueLength((prev) => prev + 1);
      setSuccess(true);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Could not join the queue.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Reservation',
      'Are you sure you want to cancel your reservation for this book?',
      [
        { text: 'Keep It', style: 'cancel' },
        {
          text: 'Cancel Reservation',
          style: 'destructive',
          onPress: async () => {
            if (!myReservation) return;
            setSubmitting(true);
            try {
              await cancelReservation(myReservation._id);
              setCancelled(true);
            } catch (err: any) {
              const msg = err?.response?.data?.error || 'Could not cancel reservation.';
              Alert.alert('Error', msg);
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  // ── Success state ──────────────────────────────────────────────────────────
  if (success && myReservation) {
    return (
      <View style={styles.feedbackContainer}>
        <View style={[styles.feedbackIcon, { backgroundColor: '#fef3c7' }]}>
          <Ionicons name="time" size={40} color="#f59e0b" />
        </View>
        <Text style={styles.feedbackTitle}>You're in the Queue!</Text>
        <Text style={styles.feedbackBody}>
          You are{' '}
          <Text style={styles.feedbackHighlight}>#{myReservation.queuePosition}</Text>
          {' '}in line.{'\n\n'}
          We'll notify you when a copy becomes available. You'll have 7 days to pick it up once notified.
        </Text>
        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => router.replace('/(tabs)/reservations')}
        >
          <Text style={styles.doneBtnText}>View My Reservations</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Cancelled state ────────────────────────────────────────────────────────
  if (cancelled) {
    return (
      <View style={styles.feedbackContainer}>
        <View style={[styles.feedbackIcon, { backgroundColor: '#f3f4f6' }]}>
          <Ionicons name="close-circle-outline" size={40} color={Colors.textMuted} />
        </View>
        <Text style={styles.feedbackTitle}>Reservation Cancelled</Text>
        <Text style={styles.feedbackBody}>Your spot in the queue has been released.</Text>
        <TouchableOpacity
          style={[styles.doneBtn, { backgroundColor: Colors.textSecond }]}
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
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  const alreadyReserved = !!myReservation;
  const myPosition = myReservation?.queuePosition ?? queueLength + 1;
  // visible queue bubbles capped at 8
  const visibleBubbles = Math.min(queueLength, 8);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reserve Book</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Book card */}
        <View style={styles.bookCard}>
          <View style={styles.bookIconWrap}>
            <Ionicons name="book" size={28} color={Colors.accent} />
          </View>
          <View style={styles.bookInfo}>
            <Text style={styles.bookTitle} numberOfLines={2}>{book.title}</Text>
            <Text style={styles.bookAuthor}>{book.author}</Text>
            <View style={styles.unavailBadge}>
              <View style={styles.unavailDot} />
              <Text style={styles.unavailText}>All copies checked out</Text>
            </View>
          </View>
        </View>

        {/* Queue status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Queue Status</Text>
          <View style={styles.queueRow}>
            {/* Position bubble */}
            <View style={styles.positionWrap}>
              <View style={styles.positionBubble}>
                <Text style={styles.positionText}>
                  #{alreadyReserved ? myPosition : queueLength + 1}
                </Text>
              </View>

              {/* Visual queue dots */}
              {queueLength > 0 && (
                <View style={styles.bubblesRow}>
                  {Array.from({ length: visibleBubbles }).map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.queueDot,
                        alreadyReserved && i === myPosition - 1 && styles.queueDotActive,
                      ]}
                    >
                      <Text style={[
                        styles.queueDotText,
                        alreadyReserved && i === myPosition - 1 && styles.queueDotTextActive,
                      ]}>
                        {i + 1}
                      </Text>
                    </View>
                  ))}
                  {queueLength > 8 && (
                    <Text style={styles.moreText}>+{queueLength - 8}</Text>
                  )}
                  {!alreadyReserved && (
                    <View style={styles.queueDotNext}>
                      <Text style={styles.queueDotNextText}>{queueLength + 1}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Queue description */}
            <View style={styles.queueDesc}>
              <Text style={styles.queueDescTitle}>
                {alreadyReserved ? 'Your position in queue' : 'You would be next in line'}
              </Text>
              <Text style={styles.queueDescSub}>
                {queueLength === 0
                  ? "No one else is waiting — you'll be first!"
                  : `${queueLength} ${queueLength === 1 ? 'person' : 'people'} currently in queue`}
              </Text>
            </View>
          </View>
        </View>

        {/* Already reserved banner */}
        {alreadyReserved && (
          <View style={styles.reservedBanner}>
            <Ionicons name="time-outline" size={18} color="#f59e0b" />
            <Text style={styles.reservedBannerText}>
              You are #{myPosition} in the queue for this book.
            </Text>
          </View>
        )}

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
        </View>

        {/* Reservation policy */}
        <View style={styles.policyCard}>
          <View style={styles.policyHeader}>
            <Ionicons name="information-circle-outline" size={18} color="#f59e0b" />
            <Text style={styles.policyTitle}>First Come, First Served</Text>
          </View>
          {[
            'Reservations are fulfilled in the order they were made',
            'When a copy is returned, the first person in queue is notified',
            'You have 7 days to pick up the book once notified',
            'You may cancel your reservation at any time',
          ].map((rule) => (
            <Text key={rule} style={styles.policyItem}>• {rule}</Text>
          ))}
        </View>

        {/* Actions */}
        {alreadyReserved ? (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
              <Text style={styles.cancelBtnText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.destructiveBtn, submitting && styles.btnDisabled]}
              onPress={handleCancel}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.destructiveBtnText}>Cancel Reservation</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.joinBtn, submitting && styles.btnDisabled]}
              onPress={handleJoinQueue}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.joinBtnText}>Join Queue</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    ...cardShadow,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontFamily: Fonts.heading, color: Colors.textPrimary },

  content: { padding: 16, paddingBottom: 32 },

  bookCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.surface, borderRadius: Radius.container, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: Colors.border, ...cardShadow,
  },
  bookIconWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.accentMuted,
    justifyContent: 'center', alignItems: 'center',
  },
  bookInfo: { flex: 1 },
  bookTitle: { fontSize: 16, fontFamily: Fonts.bodySemiBold, color: Colors.textPrimary, marginBottom: 2 },
  bookAuthor: { fontSize: 13, fontFamily: Fonts.body, color: Colors.textSecond, marginBottom: 8 },
  unavailBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: Radius.inner, backgroundColor: Colors.errorBg,
  },
  unavailDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.error },
  unavailText: { fontSize: 12, fontFamily: Fonts.bodyBold, color: Colors.error },

  section: {
    backgroundColor: Colors.surface, borderRadius: Radius.container, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: Colors.border, ...cardShadow,
  },
  sectionTitle: { fontSize: 16, fontFamily: Fonts.heading, color: Colors.textPrimary, marginBottom: 14 },

  queueRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  positionWrap: { alignItems: 'center' },
  positionBubble: {
    width: 72, height: 72, borderRadius: Radius.container,
    backgroundColor: Colors.accentMuted,
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  positionText: { fontSize: 26, fontFamily: Fonts.heading, color: Colors.accent },
  bubblesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, maxWidth: 120 },
  queueDot: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.surfaceMuted,
    justifyContent: 'center', alignItems: 'center',
  },
  queueDotActive: { backgroundColor: Colors.accent },
  queueDotText: { fontSize: 10, fontFamily: Fonts.bodyBold, color: Colors.textSecond },
  queueDotTextActive: { color: '#fff', fontFamily: Fonts.bodyBold },
  queueDotNext: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 2, borderStyle: 'dashed', borderColor: Colors.accent,
    backgroundColor: Colors.accentMuted,
    justifyContent: 'center', alignItems: 'center',
  },
  queueDotNextText: { fontSize: 10, fontFamily: Fonts.bodyBold, color: Colors.accent },
  moreText: { fontSize: 11, fontFamily: Fonts.body, color: Colors.textMuted, alignSelf: 'center' },
  queueDesc: { flex: 1, paddingTop: 4 },
  queueDescTitle: { fontSize: 15, fontFamily: Fonts.bodySemiBold, color: Colors.textPrimary, marginBottom: 4 },
  queueDescSub: { fontSize: 13, fontFamily: Fonts.body, color: Colors.textSecond, lineHeight: 18 },

  reservedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.accentMuted, borderRadius: Radius.container, padding: 14,
    marginBottom: 16, borderWidth: 1, borderColor: Colors.border,
  },
  reservedBannerText: { flex: 1, fontSize: 14, fontFamily: Fonts.bodyMedium, color: Colors.accentDark },

  fieldGroup: { marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontFamily: Fonts.bodyMedium, color: Colors.textSecond, marginBottom: 6 },
  fieldReadOnly: {
    backgroundColor: Colors.surfaceMuted, borderRadius: Radius.container, padding: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  fieldValue: { fontSize: 14, fontFamily: Fonts.body, color: Colors.textPrimary },

  policyCard: {
    backgroundColor: Colors.surfaceMuted, borderRadius: Radius.container, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  policyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  policyTitle: {
    fontSize: 13, fontFamily: Fonts.bodyBold, color: Colors.textSecond,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  policyItem: { fontSize: 13, fontFamily: Fonts.body, color: Colors.textSecond, lineHeight: 22 },

  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: Radius.container,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', backgroundColor: Colors.surface,
  },
  cancelBtnText: { fontSize: 15, fontFamily: Fonts.bodySemiBold, color: Colors.textPrimary },
  joinBtn: {
    flex: 1, paddingVertical: 14, borderRadius: Radius.container,
    alignItems: 'center', backgroundColor: Colors.accent,
    elevation: 4, shadowColor: Colors.shadow, shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
  },
  joinBtnText: { fontSize: 15, fontFamily: Fonts.bodySemiBold, color: '#fff' },
  destructiveBtn: {
    flex: 1, paddingVertical: 14, borderRadius: Radius.container,
    alignItems: 'center', backgroundColor: Colors.error,
  },
  destructiveBtnText: { fontSize: 15, fontFamily: Fonts.bodySemiBold, color: '#fff' },
  btnDisabled: { opacity: 0.5 },

  feedbackContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 32, backgroundColor: Colors.background,
  },
  feedbackIcon: {
    width: 80, height: 80, borderRadius: 40,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  feedbackTitle: {
    fontSize: 22, fontFamily: Fonts.heading, color: Colors.textPrimary, textAlign: 'center', marginBottom: 12,
  },
  feedbackBody: {
    fontSize: 14, fontFamily: Fonts.body, color: Colors.textSecond, textAlign: 'center', lineHeight: 22, marginBottom: 32,
  },
  feedbackHighlight: { fontFamily: Fonts.bodySemiBold, color: Colors.accent },
  doneBtn: {
    backgroundColor: Colors.accent, borderRadius: Radius.container,
    paddingVertical: 14, paddingHorizontal: 40,
    elevation: 4, shadowColor: Colors.shadow, shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
  },
  doneBtnText: { color: '#fff', fontSize: 15, fontFamily: Fonts.bodySemiBold },
});
