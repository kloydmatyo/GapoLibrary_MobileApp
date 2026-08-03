import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '@/lib/api';
import Colors from '@/constants/colors';

interface Notification {
  _id: string;
  type: 'borrow_request' | 'pickup_confirmed' | 'returned' | 'overdue' | 'reservation_ready' | 'general';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

const TYPE_CONFIG: Record<Notification['type'], {
  icon: string;
  accentColor: string;
  iconBg: string;
  iconColor: string;
  route: string | null;
}> = {
  overdue: {
    icon: 'alert-circle',
    accentColor: Colors.error,
    iconBg: Colors.errorBg,
    iconColor: Colors.error,
    route: '/(tabs)/history',
  },
  reservation_ready: {
    icon: 'time',
    accentColor: '#f59e0b',
    iconBg: '#fef3c7',
    iconColor: '#f59e0b',
    route: '/(tabs)/reservations',
  },
  pickup_confirmed: {
    icon: 'checkmark-circle',
    accentColor: '#f59e0b',
    iconBg: '#fef3c7',
    iconColor: '#f59e0b',
    route: '/(tabs)/reservations',
  },
  borrow_request: {
    icon: 'book',
    accentColor: Colors.brand,
    iconBg: Colors.brandMuted,
    iconColor: Colors.brand,
    route: '/(tabs)/history',
  },
  returned: {
    icon: 'checkmark-done',
    accentColor: Colors.brand,
    iconBg: Colors.brandMuted,
    iconColor: Colors.brand,
    route: '/(tabs)/history',
  },
  general: {
    icon: 'information-circle',
    accentColor: '#9ca3af',
    iconBg: '#f3f4f6',
    iconColor: '#6b7280',
    route: null,
  },
};

function formatTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const router = useRouter();

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data.notifications || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchNotifications(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchNotifications(); };

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    } catch {}
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;
    setMarkingAll(true);
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch {}
    finally { setMarkingAll(false); }
  };

  const handleTap = async (item: Notification) => {
    if (!item.read) await markAsRead(item._id);
    const config = TYPE_CONFIG[item.type];
    if (config.route) router.push(config.route as any);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const renderItem = ({ item, index }: { item: Notification; index: number }) => {
    const cfg = TYPE_CONFIG[item.type];
    const isLast = index === notifications.length - 1;

    return (
      <TouchableOpacity
        style={[styles.item, !isLast && styles.itemBorder]}
        onPress={() => handleTap(item)}
        activeOpacity={0.7}
      >
        {/* Left accent bar */}
        <View style={[styles.accentBar, { backgroundColor: cfg.accentColor }]} />

        {/* Icon */}
        <View style={[styles.iconWrap, { backgroundColor: cfg.iconBg }]}>
          <Ionicons name={cfg.icon as any} size={22} color={cfg.iconColor} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={[styles.title, !item.read && styles.titleUnread]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
          <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
        </View>

        {/* Unread dot */}
        {!item.read && (
          <View style={[styles.unreadDot, { backgroundColor: cfg.accentColor }]} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={styles.headerSub}>{unreadCount} unread</Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={[styles.markAllBtn, markingAll && { opacity: 0.5 }]}
            onPress={markAllAsRead}
            disabled={markingAll}
          >
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Card panel */}
      <View style={styles.panel}>
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.brand]} />
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="notifications-off-outline" size={56} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>No notifications yet</Text>
                <Text style={styles.emptyText}>You're all caught up!</Text>
              </View>
            ) : null
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14,
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: Colors.textPrimary, letterSpacing: -0.3 },
  headerSub: { fontSize: 13, color: Colors.textMuted, fontWeight: '600', marginTop: 2 },
  markAllBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: Colors.brandMuted, borderRadius: 20,
  },
  markAllText: { fontSize: 13, fontWeight: '700', color: Colors.brandDarker },

  panel: {
    marginHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: Colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    flex: 1,
    marginBottom: 16,
  },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingRight: 16,
    backgroundColor: Colors.surface,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  accentBar: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 2,
    marginRight: 12,
    marginLeft: 0,
  },

  iconWrap: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12, flexShrink: 0,
  },

  content: { flex: 1 },
  title: {
    fontSize: 14, fontWeight: '700', color: Colors.textPrimary,
    marginBottom: 3, lineHeight: 19,
  },
  titleUnread: { fontWeight: '900' },
  message: {
    fontSize: 13, color: Colors.textSecond, lineHeight: 18, marginBottom: 5,
  },
  time: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },

  unreadDot: {
    width: 10, height: 10, borderRadius: 5,
    marginLeft: 10, flexShrink: 0,
  },

  emptyWrap: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginTop: 14 },
  emptyText: { fontSize: 13, color: Colors.textMuted, marginTop: 4, fontWeight: '600' },
});
