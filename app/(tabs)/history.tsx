import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getHistory } from '@/lib/api';
import Colors from '@/constants/colors';
import { useOverdue } from '@/context/OverdueContext';

interface HistoryItem {
  _id: string;
  bookTitle: string;
  bookAuthor: string;
  checkoutDate: string;
  dueDate: string;
  returnDate?: string;
  status: 'pending_pickup' | 'active' | 'returned' | 'overdue' | 'expired';
  confirmedBy?: string | null;
  returnedTo?: string | null;
}

const STATUS_CONFIG = {
  pending_pickup: { color: '#f59e0b', bg: '#fef3c7', label: 'Pending Pickup', icon: 'time-outline' as const },
  active:         { color: Colors.brand, bg: Colors.brandLight, label: 'Active', icon: 'checkmark-circle-outline' as const },
  returned:       { color: Colors.success, bg: Colors.primary[50], label: 'Returned', icon: 'checkmark-done-outline' as const },
  overdue:        { color: Colors.error, bg: Colors.errorBg, label: 'Overdue', icon: 'alert-circle-outline' as const },
  expired:        { color: '#6b7280', bg: '#f3f4f6', label: 'Expired', icon: 'close-circle-outline' as const },
};

type FilterKey = 'all' | HistoryItem['status'];

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',            label: 'All' },
  { key: 'pending_pickup', label: 'Awaiting Pickup' },
  { key: 'active',         label: 'Borrowed' },
  { key: 'overdue',        label: 'Overdue' },
  { key: 'returned',       label: 'Returned' },
];

export default function HistoryScreen() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overdueCount, setOverdueCount] = useState(0);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const { refreshOverdueCount } = useOverdue();

  const fetchHistory = useCallback(async () => {
    try {
      const res = await getHistory();
      const historyData: HistoryItem[] = res.data.history;

      // Normalise: treat active-but-past-due as overdue client-side
      const normalised = historyData.map((item) => ({
        ...item,
        status: (
          item.status === 'active' && new Date(item.dueDate) < new Date()
            ? 'overdue'
            : item.status
        ) as HistoryItem['status'],
      }));

      setHistory(normalised);

      const overdue = normalised.filter((item) => item.status === 'overdue').length;
      setOverdueCount(overdue);

      await refreshOverdueCount();
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing, refreshOverdueCount]);

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

  const fmt = (d: string) => new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });

  const getDaysOverdue = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diff = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const renderItem = ({ item }: { item: HistoryItem }) => {
    const cfg = STATUS_CONFIG[item.status];
    const isOverdue = item.status === 'overdue';
    const daysOverdue = isOverdue ? getDaysOverdue(item.dueDate) : 0;

    return (
      <View style={[styles.item, isOverdue && styles.overdueItem]}>
        <View style={[styles.iconWrap, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon} size={22} color={cfg.color} />
        </View>
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
              <Text style={styles.staffLabel}>Pickup confirmed by: </Text>{item.confirmedBy}
            </Text>
          )}
          {item.returnedTo && (
            <Text style={styles.staffInfo}>
              <Text style={styles.staffLabel}>Returned to: </Text>{item.returnedTo}
            </Text>
          )}
        </View>
        <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>
    );
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 60 }} size="large" color={Colors.brand} />;

  return (
    <View style={styles.container}>
      {overdueCount > 0 && (
        <View style={styles.overdueAlert}>
          <Ionicons name="warning" size={20} color={Colors.error} />
          <Text style={styles.overdueAlertText}>
            You have {overdueCount} overdue book{overdueCount > 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
        style={styles.filterScrollView}
      >
        {FILTERS.map((f) => {
          const isActive = activeFilter === f.key;
          const count = countFor(f.key);
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.brand]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="time-outline" size={48} color={Colors.border} />
            <Text style={styles.empty}>
              {activeFilter === 'all' ? 'No borrowing history yet.' : `No ${FILTERS.find(f => f.key === activeFilter)?.label.toLowerCase()} loans.`}
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
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
  },
  overdueAlertText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.error,
  },
  filterScrollView: {
    flexGrow: 0,
    flexShrink: 0,
  },
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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    height: 36,
  },
  filterChipActive: {
    backgroundColor: Colors.brand,
    borderColor: Colors.brand,
  },
  filterChipText: {
    fontSize: 13, fontWeight: '700', color: Colors.textPrimary,
  },
  filterChipTextActive: { color: '#fff' },
  filterCount: {
    backgroundColor: '#f3f4f6', borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 1,
  },
  filterCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  filterCountText: { fontSize: 11, fontWeight: '700', color: Colors.textMuted },
  filterCountTextActive: { color: '#fff' },
  list: { padding: 16 },
  item: {
    backgroundColor: Colors.surface, borderRadius: 20, padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    elevation: 4, shadowColor: Colors.shadow, shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  overdueItem: { borderWidth: 1.5, borderColor: Colors.error },
  iconWrap: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1 },
  bookTitle: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary, marginBottom: 2 },
  author: { fontSize: 12, color: Colors.textSecond, marginBottom: 4, fontWeight: '600' },
  date: { fontSize: 11, color: Colors.textMuted },
  overdueDate: { color: Colors.error, fontWeight: '700' },
  staffInfo: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  staffLabel: { fontWeight: '700', color: Colors.textSecond },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '800' },
  emptyWrap: { alignItems: 'center', marginTop: 60 },
  empty: { marginTop: 12, color: Colors.textMuted, fontSize: 14 },
});
