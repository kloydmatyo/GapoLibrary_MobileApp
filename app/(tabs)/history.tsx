import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, Alert } from 'react-native';
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
}

const STATUS_CONFIG = {
  pending_pickup: { color: '#f59e0b', bg: '#fef3c7', label: 'Pending Pickup', icon: 'time-outline' as const },
  active:         { color: Colors.brand, bg: Colors.brandLight, label: 'Active', icon: 'checkmark-circle-outline' as const },
  returned:       { color: Colors.success, bg: Colors.primary[50], label: 'Returned', icon: 'checkmark-done-outline' as const },
  overdue:        { color: Colors.error, bg: Colors.errorBg, label: 'Overdue', icon: 'alert-circle-outline' as const },
  expired:        { color: '#6b7280', bg: '#f3f4f6', label: 'Expired', icon: 'close-circle-outline' as const },
};

export default function HistoryScreen() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overdueCount, setOverdueCount] = useState(0);
  const { refreshOverdueCount } = useOverdue();

  const fetchHistory = useCallback(async () => {
    try {
      const res = await getHistory();
      const historyData = res.data.history;
      setHistory(historyData);
      
      // Count overdue items
      const overdue = historyData.filter((item: HistoryItem) => item.status === 'overdue').length;
      setOverdueCount(overdue);
      
      // Update global overdue count
      await refreshOverdueCount();
      
      // Show alert if there are overdue books
      if (overdue > 0 && !refreshing) {
        Alert.alert(
          '⚠️ Overdue Books',
          `You have ${overdue} overdue book${overdue > 1 ? 's' : ''}. Please return ${overdue > 1 ? 'them' : 'it'} to the library as soon as possible.`,
          [{ text: 'OK' }]
        );
      }
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
      
      <FlatList
        data={history}
        keyExtractor={(h) => h._id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.brand]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="time-outline" size={48} color={Colors.border} />
            <Text style={styles.empty}>No borrowing history yet.</Text>
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
  list: { padding: 16 },
  item: {
    backgroundColor: Colors.surface, borderRadius: 12, padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4,
  },
  overdueItem: {
    borderWidth: 2,
    borderColor: Colors.error,
  },
  iconWrap: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1 },
  bookTitle: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 2 },
  author: { fontSize: 12, color: Colors.textSecond, marginBottom: 4 },
  date: { fontSize: 11, color: Colors.textMuted },
  overdueDate: { color: Colors.error, fontWeight: '600' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '600' },
  emptyWrap: { alignItems: 'center', marginTop: 60 },
  empty: { marginTop: 12, color: Colors.textMuted, fontSize: 14 },
});
