import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getHistory, renewLoan } from '@/lib/api';
import Colors, { Radius } from '@/constants/colors';
import { Fonts } from '@/constants/typography';
import { useOverdue } from '@/context/OverdueContext';
import BookCover from '@/components/BookCover';
import { normalizeLoanStatus, statusBorderColor, LoanDisplayStatus } from '@/lib/loanStatus';

interface HistoryItem {
  _id: string;
  bookId?: string;
  bookTitle: string;
  bookAuthor: string;
  checkoutDate: string;
  dueDate: string;
  returnDate?: string;
  status: 'pending_pickup' | 'active' | 'returned' | 'overdue' | 'expired' | 'pending_renewal';
  confirmedBy?: string | null;
  returnedTo?: string | null;
  isbn?: string;
  coverImageUrl?: string;
  bookCoverImageUrl?: string | null;
  bookIsbn?: string | null;
  renewalCount?: number;
  renewedAt?: string | null;
}

const STATUS_LABELS: Record<LoanDisplayStatus, string> = {
  pending_pickup: 'Awaiting Pickup',
  active: 'Active',
  returned: 'Returned',
  overdue: 'Overdue',
  expired: 'Expired',
  pending_renewal: 'Renewal Pending',
};

type FilterKey = 'all' | LoanDisplayStatus;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending_pickup', label: 'Awaiting Pickup' },
  { key: 'active', label: 'Borrowed' },
  { key: 'pending_renewal', label: 'Renewal Pending' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'returned', label: 'Returned' },
];

export default function HistoryScreen() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overdueCount, setOverdueCount] = useState(0);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [renewingId, setRenewingId] = useState<string | null>(null);
  const { setOverdueCount: setGlobalOverdueCount } = useOverdue();

  const fetchHistory = useCallback(async () => {
    try {
      const historyRes = await getHistory();
      const historyData: HistoryItem[] = historyRes.data.history;

      const normalised = historyData.map((item) => {
        // Don't normalize pending_renewal — keep it as-is
        const displayStatus = item.status === 'pending_renewal'
          ? 'pending_renewal'
          : normalizeLoanStatus(item.status, item.dueDate);
        return {
          ...item,
          status: displayStatus as HistoryItem['status'],
          isbn: (item as any).bookIsbn ?? item.isbn,
          coverImageUrl: (item as any).bookCoverImageUrl ?? item.coverImageUrl,
        };
      });

      setHistory(normalised);
      const overdue = normalised.filter((item) => item.status === 'overdue').length;
      setOverdueCount(overdue);
      setGlobalOverdueCount(overdue);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [setGlobalOverdueCount]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const handleRenew = async (item: HistoryItem) => {
    Alert.alert(
      'Request Renewal',
      `Request a renewal for "${item.bookTitle}"? The librarian will need to confirm it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request',
          onPress: async () => {
            setRenewingId(item._id);
            try {
              await renewLoan(item._id);
              // Optimistically update status locally
              setHistory((prev) =>
                prev.map((h) =>
                  h._id === item._id ? { ...h, status: 'pending_renewal' } : h
                )
              );
              Alert.alert(
                'Renewal Requested',
                'Your renewal request has been submitted. You\'ll be notified once the librarian confirms it.'
              );
            } catch (err: any) {
              const msg = err?.response?.data?.error || 'Something went wrong. Please try again.';
              Alert.alert('Cannot Renew', msg);
            } finally {
              setRenewingId(null);
            }
          },
        },
      ]
    );
  };

  const filteredHistory = activeFilter === 'all'
    ? history
    : history.filter((h) => h.status === activeFilter);

  const countFor = (key: FilterKey) =>
    key === 'all' ? history.length : history.filter((h) => h.status === key).length;

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });

  const getDaysLeft = (dueDate: string) => {
    return Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86_400_000);
  };

  const getDaysOverdue = (dueDate: string) => {
    const diff = Math.floor((Date.now() - new Date(dueDate).getTime()) / 86_400_000);
    return diff > 0 ? diff : 0;
  };

  const canRenew = (item: HistoryItem): boolean => {
    if (item.status !== 'active') return false;
    if ((item.renewalCount ?? 0) >= 1) return false;
    const daysLeft = getDaysLeft(item.dueDate);
    return daysLeft >= 0 && daysLeft <= 2;
  };

  const renderItem = ({ item }: { item: HistoryItem }) => {
    const displayStatus = item.status as LoanDisplayStatus;
    const isOverdue = displayStatus === 'overdue';
    const isPendingRenewal = displayStatus === 'pending_renewal';
    const daysOverdue = isOverdue ? getDaysOverdue(item.dueDate) : 0;
    const daysLeft = !isOverdue && item.status === 'active' ? getDaysLeft(item.dueDate) : null;
    const borderColor = statusBorderColor(displayStatus);
    const showRenewButton = canRenew(item);
    const isRenewing = renewingId === item._id;

    return (
      <View style={[styles.item, { borderLeftColor: borderColor }]}>
        <BookCover
          isbn={item.isbn}
          coverImageUrl={item.coverImageUrl}
          width={48}
          height={64}
        />
        <View style={styles.info}>
          <Text style={styles.bookTitle} numberOfLines={2}>{item.bookTitle}</Text>
          <Text style={styles.author}>{item.bookAuthor}</Text>
          <Text style={styles.date}>Borrowed: {fmt(item.checkoutDate)}</Text>
          <Text style={[styles.date, isOverdue && styles.overdueDate]}>
            Due: {fmt(item.dueDate)}
            {isOverdue && ` (${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue)`}
          </Text>
          {daysLeft !== null && daysLeft >= 0 && (
            <Text style={[
              styles.date,
              daysLeft <= 2 ? styles.urgentDate : null,
            ]}>
              {daysLeft === 0 ? 'Due today' : daysLeft === 1 ? '1 day left' : `${daysLeft} days left`}
            </Text>
          )}
          {item.returnDate && <Text style={styles.date}>Returned: {fmt(item.returnDate)}</Text>}
          {item.confirmedBy && (
            <Text style={styles.staffInfo}>
              <Text style={styles.staffLabel}>Pickup confirmed by: </Text>
              {item.confirmedBy}
            </Text>
          )}
          {item.returnedTo && (
            <Text style={styles.staffInfo}>
              <Text style={styles.staffLabel}>Returned to: </Text>
              {item.returnedTo}
            </Text>
          )}
          {(item.renewalCount ?? 0) >= 1 && item.renewedAt && (
            <Text style={styles.renewedInfo}>
              Renewed on {fmt(item.renewedAt)}
            </Text>
          )}

          {/* Renew button — only within 1–2 days of due date */}
          {showRenewButton && (
            <TouchableOpacity
              style={[styles.renewBtn, isRenewing && styles.renewBtnDisabled]}
              onPress={() => handleRenew(item)}
              disabled={isRenewing}
              activeOpacity={0.75}
            >
              {isRenewing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="refresh" size={13} color="#fff" />
                  <Text style={styles.renewBtnText}>Request Renewal</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Pending renewal indicator */}
          {isPendingRenewal && (
            <View style={styles.pendingRenewalBadge}>
              <Ionicons name="time-outline" size={12} color="#9333ea" />
              <Text style={styles.pendingRenewalText}>Awaiting librarian approval</Text>
            </View>
          )}
        </View>

        <View style={styles.badge}>
          <Text
            style={[
              styles.badgeText,
              isOverdue && styles.badgeTextOverdue,
              isPendingRenewal && styles.badgeTextPendingRenewal,
              displayStatus === 'returned' && styles.badgeTextMuted,
            ]}
          >
            {STATUS_LABELS[displayStatus] ?? displayStatus}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <ActivityIndicator
        style={{ marginTop: 60 }}
        size="large"
        color={Colors.accent}
      />
    );
  }

  if (history.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyFull}>
          <Text style={styles.emptyTitle}>No borrowing history yet</Text>
          <Text style={styles.emptyBody}>
            Books you borrow will appear here with due dates and return status.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {overdueCount > 0 && (
        <View style={styles.overdueAlert}>
          <Ionicons name="alert-circle" size={20} color={Colors.error} />
          <Text style={styles.overdueAlertText}>
            You have {overdueCount} overdue book{overdueCount > 1 ? 's' : ''}
          </Text>
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
        style={styles.filterScrollView}
      >
        {FILTERS.map((f) => {
          const isActive = activeFilter === f.key;
          const count = countFor(f.key);
          if (f.key !== 'all' && count === 0) return null;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setActiveFilter(f.key)}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {f.label}
              </Text>
              <View style={[styles.filterCount, isActive && styles.filterCountActive]}>
                <Text style={[styles.filterCountText, isActive && styles.filterCountTextActive]}>
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={filteredHistory}
        keyExtractor={(h) => h._id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.accent]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyFilter}>
            <Text style={styles.emptyFilterText}>
              No {FILTERS.find((f) => f.key === activeFilter)?.label.toLowerCase()} loans.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  overdueAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.errorBg,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: Radius.container,
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
  },
  overdueAlertText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.error,
  },
  filterScrollView: { flexGrow: 0, flexShrink: 0 },
  filterScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.container,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    height: 36,
  },
  filterChipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textPrimary,
  },
  filterChipTextActive: { color: '#fff' },
  filterCount: {
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.inner,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  filterCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  filterCountText: {
    fontSize: 11,
    fontFamily: Fonts.bodyBold,
    color: Colors.textMuted,
  },
  filterCountTextActive: { color: '#fff' },
  list: { padding: 16 },
  item: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.container,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
  },
  info: { flex: 1 },
  bookTitle: {
    fontSize: 14,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  author: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: Colors.textSecond,
    marginBottom: 4,
  },
  date: {
    fontSize: 11,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
  },
  overdueDate: { color: Colors.error, fontFamily: Fonts.bodySemiBold },
  urgentDate: { color: '#d97706', fontFamily: Fonts.bodySemiBold },
  staffInfo: {
    fontSize: 11,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    marginTop: 2,
  },
  staffLabel: { fontFamily: Fonts.bodySemiBold, color: Colors.textSecond },
  renewedInfo: {
    fontSize: 11,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    marginTop: 2,
    fontStyle: 'italic',
  },
  renewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: Colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.inner,
  },
  renewBtnDisabled: {
    opacity: 0.6,
  },
  renewBtnText: {
    fontSize: 11,
    fontFamily: Fonts.bodyBold,
    color: '#fff',
  },
  pendingRenewalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  pendingRenewalText: {
    fontSize: 11,
    fontFamily: Fonts.bodySemiBold,
    color: '#9333ea',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.inner,
    backgroundColor: Colors.surfaceMuted,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 10,
    fontFamily: Fonts.bodyBold,
    color: Colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  badgeTextOverdue: { color: Colors.error },
  badgeTextPendingRenewal: { color: '#9333ea' },
  badgeTextMuted: { color: Colors.statusReturned },
  emptyFull: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.textSecond,
    textAlign: 'center',
    lineHeight: 21,
  },
  emptyFilter: { paddingTop: 48, paddingHorizontal: 24 },
  emptyFilterText: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.textSecond,
    textAlign: 'center',
  },
});
