import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getHistory } from '@/lib/api';
import Colors from '@/constants/colors';

interface HistoryItem {
  _id: string;
  bookTitle: string;
  bookAuthor: string;
  checkoutDate: string;
  dueDate: string;
  returnDate?: string;
  status: 'active' | 'returned' | 'overdue';
}

const STATUS_CONFIG = {
  active:   { color: Colors.brand,   bg: Colors.brandLight, label: 'Active' },
  returned: { color: Colors.success, bg: Colors.primary[50], label: 'Returned' },
  overdue:  { color: Colors.error,   bg: Colors.errorBg,    label: 'Overdue' },
};

export default function HistoryScreen() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHistory()
      .then((res) => setHistory(res.data.history))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fmt = (d: string) => new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });

  const renderItem = ({ item }: { item: HistoryItem }) => {
    const cfg = STATUS_CONFIG[item.status];
    return (
      <View style={styles.item}>
        <View style={styles.iconWrap}>
          <Ionicons name="book-outline" size={22} color={Colors.brand} />
        </View>
        <View style={styles.info}>
          <Text style={styles.bookTitle} numberOfLines={2}>{item.bookTitle}</Text>
          <Text style={styles.author}>{item.bookAuthor}</Text>
          <Text style={styles.date}>Borrowed: {fmt(item.checkoutDate)}</Text>
          <Text style={styles.date}>Due: {fmt(item.dueDate)}</Text>
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
      <FlatList
        data={history}
        keyExtractor={(h) => h._id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
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
  list: { padding: 16 },
  item: {
    backgroundColor: Colors.surface, borderRadius: 12, padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4,
  },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.brandLight, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1 },
  bookTitle: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 2 },
  author: { fontSize: 12, color: Colors.textSecond, marginBottom: 4 },
  date: { fontSize: 11, color: Colors.textMuted },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '600' },
  emptyWrap: { alignItems: 'center', marginTop: 60 },
  empty: { marginTop: 12, color: Colors.textMuted, fontSize: 14 },
});
