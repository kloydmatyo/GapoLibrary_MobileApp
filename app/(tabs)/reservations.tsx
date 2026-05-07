import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, RefreshControl, TouchableOpacity, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getHistory, getReservations, cancelReservation, getBook } from '@/lib/api';
import Colors from '@/constants/colors';

// ── Types ──────────────────────────────────────────────────────────────────

interface QueueReservation {
  _id: string;
  bookId: string;
  bookTitle?: string;
  bookAuthor?: string;
  queuePosition: number;
  reservedAt: string;
  status: 'pending';
}

interface CirculationItem {
  _id: string;
  bookTitle: string;
  bookAuthor: string;
  checkoutDate: string;
  dueDate: string;
  status: 'pending_pickup' | 'active' | 'expired';
  pickupDeadline?: string;
  pickupConfirmedAt?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

const getTimeRemaining = (deadline: string) => {
  const diffMs = new Date(deadline).getTime() - Date.now();
  if (diffMs < 0) return 'Expired';
  const h = Math.floor(diffMs / 3_600_000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d} day${d > 1 ? 's' : ''} left`;
  if (h > 0) return `${h} hour${h > 1 ? 's' : ''} left`;
  return 'Less than 1 hour';
};

// ── Queue reservation card ─────────────────────────────────────────────────

function QueueCard({
  item,
  onCancel,
  cancelling,
}: {
  item: QueueReservation;
  onCancel: (id: string) => void;
  cancelling: boolean;
}) {
  return (
    <View style={[styles.card, styles.queueCard]}>
      {/* Header */}
      <View style={styles.queueHeader}>
        <View style={styles.statusLeft}>
          <Ionicons name="time-outline" size={20} color="#f59e0b" />
          <Text style={[styles.statusLabel, { color: '#f59e0b' }]}>In Queue</Text>
        </View>
        <View style={styles.positionChip}>
          <Text style={styles.positionText}>#{item.queuePosition}</Text>
        </View>
      </View>

      {/* Book info */}
      <View style={styles.bookInfo}>
        <View style={styles.bookIcon}>
          <Ionicons name="book" size={24} color={Colors.brand} />
        </View>
        <View style={styles.bookDetails}>
          <Text style={styles.bookTitle} numberOfLines={2}>
            {item.bookTitle ?? 'Loading…'}
          </Text>
          {item.bookAuthor ? (
            <Text style={styles.bookAuthor}>{item.bookAuthor}</Text>
          ) : null}
        </View>
      </View>

      {/* Reserved date */}
      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={14} color={Colors.textMuted} />
        <Text style={styles.metaText}>Queued on {formatDate(item.reservedAt)}</Text>
      </View>

      {/* Policy note */}
      <View style={styles.queueNote}>
        <Text style={styles.queueNoteText}>
          You'll be notified when a copy becomes available. You'll have 7 days to pick it up.
        </Text>
      </View>

      {/* Cancel button */}
      <TouchableOpacity
        style={[styles.cancelBtn, cancelling && styles.btnDisabled]}
        onPress={() => onCancel(item._id)}
        disabled={cancelling}
      >
        {cancelling
          ? <ActivityIndicator size="small" color={Colors.error} />
          : <>
              <Ionicons name="close-circle-outline" size={16} color={Colors.error} />
              <Text style={styles.cancelBtnText}>Cancel Reservation</Text>
            </>}
      </TouchableOpacity>
    </View>
  );
}

// ── Circulation pickup card (existing design, kept intact) ─────────────────

function CirculationCard({ item }: { item: CirculationItem }) {
  const isPending = item.status === 'pending_pickup';
  const isExpired = item.status === 'expired';

  const config = isPending
    ? { color: '#f59e0b', bg: '#fef3c7', label: 'Ready for Pickup', icon: 'time-outline' as const, desc: 'Your book is ready! Please pick it up before the deadline.' }
    : item.status === 'active'
      ? { color: Colors.brand, bg: Colors.brandLight, label: 'Picked Up', icon: 'checkmark-circle-outline' as const, desc: 'You have successfully picked up this book.' }
      : { color: '#6b7280', bg: '#f3f4f6', label: 'Expired', icon: 'close-circle-outline' as const, desc: 'Pickup deadline has passed. Reservation cancelled.' };

  return (
    <View style={[styles.card, isPending && styles.pendingCard, isExpired && styles.expiredCard]}>
      {/* Status header */}
      <View style={[styles.statusHeader, { backgroundColor: config.bg }]}>
        <View style={styles.statusLeft}>
          <Ionicons name={config.icon} size={20} color={config.color} />
          <Text style={[styles.statusLabel, { color: config.color }]}>{config.label}</Text>
        </View>
        {isPending && item.pickupDeadline && (
          <View style={styles.timeChip}>
            <Ionicons name="alarm-outline" size={14} color={config.color} />
            <Text style={[styles.timeText, { color: config.color }]}>
              {getTimeRemaining(item.pickupDeadline)}
            </Text>
          </View>
        )}
      </View>

      {/* Book info */}
      <View style={styles.bookInfo}>
        <View style={styles.bookIcon}>
          <Ionicons name="book" size={24} color={Colors.brand} />
        </View>
        <View style={styles.bookDetails}>
          <Text style={styles.bookTitle} numberOfLines={2}>{item.bookTitle}</Text>
          <Text style={styles.bookAuthor}>{item.bookAuthor}</Text>
        </View>
      </View>

      {/* Timeline */}
      <View style={styles.timeline}>
        <View style={styles.timelineItem}>
          <View style={styles.timelineDot} />
          <View style={styles.timelineContent}>
            <Text style={styles.timelineLabel}>Requested</Text>
            <Text style={styles.timelineDate}>{formatDate(item.checkoutDate)}</Text>
          </View>
        </View>
        {item.pickupDeadline && (
          <View style={styles.timelineItem}>
            <View style={[styles.timelineDot, isPending && styles.timelineDotActive]} />
            <View style={styles.timelineContent}>
              <Text style={styles.timelineLabel}>Pickup Deadline</Text>
              <Text style={[styles.timelineDate, isPending && styles.timelineDateActive]}>
                {formatDate(item.pickupDeadline)}
              </Text>
            </View>
          </View>
        )}
        {item.pickupConfirmedAt && (
          <View style={styles.timelineItem}>
            <View style={[styles.timelineDot, styles.timelineDotComplete]} />
            <View style={styles.timelineContent}>
              <Text style={styles.timelineLabel}>Picked Up</Text>
              <Text style={styles.timelineDate}>{formatDate(item.pickupConfirmedAt)}</Text>
            </View>
          </View>
        )}
        {item.status === 'active' && (
          <View style={styles.timelineItem}>
            <View style={styles.timelineDot} />
            <View style={styles.timelineContent}>
              <Text style={styles.timelineLabel}>Due Date</Text>
              <Text style={styles.timelineDate}>{formatDate(item.dueDate)}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Description footer */}
      <View style={[styles.descFooter, { backgroundColor: config.bg }]}>
        <Text style={[styles.descFooterText, { color: config.color }]}>{config.desc}</Text>
      </View>
    </View>
  );
}

// ── Section label helper ───────────────────────────────────────────────────

function SectionLabel({
  icon, iconColor, label, labelColor, count, countBg, countColor,
}: {
  icon: any; iconColor: string; label: string; labelColor: string;
  count: number; countBg: string; countColor: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={15} color={iconColor} />
      <Text style={[styles.sectionHeaderText, { color: labelColor }]}>{label}</Text>
      <View style={[styles.sectionCount, { backgroundColor: countBg }]}>
        <Text style={[styles.sectionCountText, { color: countColor }]}>{count}</Text>
      </View>
    </View>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────

export default function ReservationsScreen() {
  const router = useRouter();
  const [queueItems, setQueueItems] = useState<QueueReservation[]>([]);
  const [circulationItems, setCirculationItems] = useState<CirculationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [queueRes, historyRes] = await Promise.all([
        getReservations(),
        getHistory(),
      ]);

      // Enrich queue reservations with book details
      const rawReservations: QueueReservation[] = queueRes.data.reservations ?? [];
      const enriched = await Promise.all(
        rawReservations.map(async (r) => {
          try {
            const bookRes = await getBook(r.bookId);
            const book = bookRes.data.book;
            return { ...r, bookTitle: book?.title ?? 'Unknown', bookAuthor: book?.author ?? '' };
          } catch {
            return { ...r, bookTitle: 'Unknown', bookAuthor: '' };
          }
        })
      );
      setQueueItems(enriched);

      // Circulation items — pending_pickup, active (picked up), expired
      const filtered = (historyRes.data.history ?? []).filter(
        (h: CirculationItem) =>
          h.status === 'pending_pickup' ||
          h.status === 'expired' ||
          (h.status === 'active' && h.pickupConfirmedAt)
      );
      setCirculationItems(filtered);
    } catch (err) {
      console.error('Failed to fetch reservations:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  const handleCancel = (reservationId: string) => {
    Alert.alert(
      'Cancel Reservation',
      'Are you sure you want to remove yourself from the queue?',
      [
        { text: 'Keep It', style: 'cancel' },
        {
          text: 'Cancel Reservation',
          style: 'destructive',
          onPress: async () => {
            setCancellingId(reservationId);
            try {
              await cancelReservation(reservationId);
              setQueueItems((prev) => prev.filter((r) => r._id !== reservationId));
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.error || 'Could not cancel reservation.');
            } finally {
              setCancellingId(null);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.brand} />
      </View>
    );
  }

  const totalItems = queueItems.length + circulationItems.length;

  return (
    <View style={styles.container}>
      {totalItems === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No Active Reservations</Text>
          <Text style={styles.emptyText}>
            Browse the catalog to borrow or reserve books
          </Text>
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => router.push('/(tabs)/books')}
          >
            <Text style={styles.browseBtnText}>Browse Catalog</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={[]}
          keyExtractor={() => ''}
          renderItem={null}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.brand]} />
          }
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <>
              {/* ── Queue section ── */}
              {queueItems.length > 0 && (
                <>
                  <SectionLabel
                    icon="time-outline"
                    iconColor="#f59e0b"
                    label="Waiting in Queue"
                    labelColor="#92400e"
                    count={queueItems.length}
                    countBg="#fef3c7"
                    countColor="#92400e"
                  />
                  {queueItems.map((item) => (
                    <QueueCard
                      key={item._id}
                      item={item}
                      onCancel={handleCancel}
                      cancelling={cancellingId === item._id}
                    />
                  ))}
                </>
              )}

              {/* ── Borrow requests section ── */}
              {circulationItems.length > 0 && (
                <>
                  <SectionLabel
                    icon="book-outline"
                    iconColor={Colors.brand}
                    label="Borrow Requests"
                    labelColor={Colors.brandDark}
                    count={circulationItems.length}
                    countBg={Colors.brandMuted}
                    countColor={Colors.brandDark}
                  />
                  {circulationItems.map((item) => (
                    <CirculationCard key={item._id} item={item} />
                  ))}
                </>
              )}
            </>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  listContent: { padding: 16, paddingBottom: 32 },

  // Section headers
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 10, marginTop: 4,
  },
  sectionHeaderText: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionCount: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
  },
  sectionCountText: { fontSize: 12, fontWeight: '700' },

  // Shared card base
  card: {
    backgroundColor: Colors.surface, borderRadius: 16, marginBottom: 16,
    overflow: 'hidden', elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },

  // Queue card specifics
  queueCard: { borderWidth: 2, borderColor: '#fde68a' },
  queueHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 12, backgroundColor: '#fef3c7',
  },
  positionChip: {
    backgroundColor: '#f59e0b', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  positionText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingBottom: 8 },
  metaText: { fontSize: 12, color: Colors.textMuted },
  queueNote: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: Colors.brandMuted, borderRadius: 8, padding: 10,
  },
  queueNoteText: { fontSize: 12, color: Colors.brandDark, lineHeight: 17 },
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginHorizontal: 16, marginBottom: 14, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1, borderColor: '#fecaca',
    backgroundColor: Colors.errorBg,
  },
  cancelBtnText: { fontSize: 13, fontWeight: '700', color: Colors.error },
  btnDisabled: { opacity: 0.5 },

  // Circulation card specifics
  pendingCard: { borderWidth: 2, borderColor: '#f59e0b' },
  expiredCard: { opacity: 0.7 },
  statusHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12,
  },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusLabel: { fontSize: 14, fontWeight: '700' },
  timeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.8)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12,
  },
  timeText: { fontSize: 12, fontWeight: '600' },

  // Shared book info
  bookInfo: { flexDirection: 'row', padding: 16, gap: 12 },
  bookIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.brandMuted, justifyContent: 'center', alignItems: 'center',
  },
  bookDetails: { flex: 1 },
  bookTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  bookAuthor: { fontSize: 14, color: Colors.textSecond },

  // Timeline
  timeline: { paddingHorizontal: 16, paddingBottom: 16 },
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  timelineDot: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: Colors.border, marginTop: 4, marginRight: 12,
  },
  timelineDotActive: { backgroundColor: '#f59e0b', width: 14, height: 14, borderRadius: 7 },
  timelineDotComplete: { backgroundColor: Colors.brand },
  timelineContent: { flex: 1 },
  timelineLabel: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, marginBottom: 2 },
  timelineDate: { fontSize: 12, color: Colors.textMuted },
  timelineDateActive: { color: '#f59e0b', fontWeight: '600' },

  // Description footer
  descFooter: { padding: 12, marginHorizontal: 16, marginBottom: 16, borderRadius: 8 },
  descFooterText: { fontSize: 13, lineHeight: 18, textAlign: 'center' },

  // Empty state
  emptyContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingVertical: 80, paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  browseBtn: {
    backgroundColor: Colors.brand, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 28,
  },
  browseBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
