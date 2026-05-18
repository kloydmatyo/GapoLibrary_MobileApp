import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl, ScrollView, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getHistory, getBooks } from '@/lib/api';
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
  status: 'pending_pickup' | 'active' | 'returned' | 'overdue' | 'expired';
  confirmedBy?: string | null;
  returnedTo?: string | null;
  isbn?: string;
  coverImageUrl?: string;
}

const STATUS_LABELS: Record<LoanDisplayStatus, string> = {
  pending_pickup: 'Awaiting Pickup',
  active: 'Active',
  returned: 'Returned',
  overdue: 'Overdue',
  expired: 'Expired',
};

type FilterKey = 'all' | HistoryItem['status'];

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending_pickup', label: 'Awaiting Pickup' },
  { key: 'active', label: 'Borrowed' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'returned', label: 'Returned' },
];

export default function HistoryScreen() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overdueCount, setOverdueCount] = useState(0);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const { setOverdueCount: setGlobalOverdueCount } = useOverdue();

  const fetchHistory = useCallback(async () => {
    try {
      const [historyRes, booksRes] = await Promise.all([getHistory(), getBooks({})]);
      const historyData: HistoryItem[] = historyRes.data.history;
      const bookMeta = new Map<string, { isbn?: string; coverImageUrl?: string }>(
        (booksRes.data.books ?? []).map((b: { _id: string; isbn?: string; coverImageUrl?: string }) => [
          b._id,
          { isbn: b.isbn, coverImageUrl: b.coverImageUrl },
        ]),
      );

      const normalised = historyData.map((item) => {
        const displayStatus = normalizeLoanStatus(item.status, item.dueDate);
        const meta = item.bookId ? bookMeta.get(item.bookId) : undefined;
        return {
          ...item,
          status: displayStatus as HistoryItem['status'],
          isbn: meta?.isbn,
          coverImageUrl: meta?.coverImageUrl,
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

  const filteredHistory = activeFilter === 'all'
    ? history
    : history.filter((h) => h.status === activeFilter);

  const countFor = (key: FilterKey) =>
    key === 'all' ? history.length : history.filter((h) => h.status === key).length;

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });

  const getDaysOverdue = (dueDate: string) => {
    const diff = Math.floor((Date.now() - new Date(dueDate).getTime()) / 86_400_000);
    return diff > 0 ? diff : 0;
  };

  const renderItem = ({ item }: { item: HistoryItem }) => {
    const displayStatus = normalizeLoanStatus(item.status, item.dueDate);
    const isOverdue = displayStatus === 'overdue';
    const daysOverdue = isOverdue ? getDaysOverdue(item.dueDate) : 0;
    const borderColor = statusBorderColor(displayStatus);

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
        </View>
        <View style={styles.badge}>
          <Text
            style={[
              styles.badgeText,
              isOverdue && styles.badgeTextOverdue,
              displayStatus === 'returned' && styles.badgeTextMuted,
            ]}
          >
            {STATUS_LABELS[displayStatus]}
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
  staffInfo: {
    fontSize: 11,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    marginTop: 2,
  },
  staffLabel: { fontFamily: Fonts.bodySemiBold, color: Colors.textSecond },
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
