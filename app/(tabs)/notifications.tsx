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
  borderColor: string;
  iconBg: string;
  iconColor: string;
  route: string | null;
}> = {
  overdue: {
    icon: 'alert-circle-outline',
    borderColor: Colors.error,
    iconBg: Colors.errorBg,
    iconColor: Colors.error,
    route: '/(tabs)/history',
  },
  reservation_ready: {
    icon: 'time-outline',
    borderColor: '#f59e0b',
    iconBg: '#fef3c7',
    iconColor: '#f59e0b',
    route: '/(tabs)/reservations',
  },
  pickup_confirmed: {
    icon: 'checkmark-circle-outline',
    borderColor: '#f59e0b',
    iconBg: '#fef3c7',
    iconColor: '#f59e0b',
    route: '/(tabs)/reservations',
  },
  borrow_request: {
    icon: 'book-outline',
    borderColor: Colors.brand,
    iconBg: Colors.brandMuted,
    iconColor: Colors.brand,
    route: '/(tabs)/history',
  },
  returned: {
    icon: 'return-down-back-outline',
    borderColor: Colors.brand,
    iconBg: Colors.brandMuted,
    iconColor: Colors.brand,
    route: '/(tabs)/history',
  },
  general: {
    icon: 'information-circle-outline',
    borderColor: '#9ca3af',
    iconBg: '#f3f4f6',
    iconColor: '#6b7280',
    route: null,
  },
};

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
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}`);
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;

    setMarkingAll(true);
    try {
      await api.post('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleTap = async (item: Notification) => {
    // Mark as read
    if (!item.read) await markAsRead(item._id);

    // Navigate based on type
    const config = TYPE_CONFIG[item.type];
    if (config.route) {
      router.push(config.route as any);
    }
  };

  const formatTime = (dateString: string) => {
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
    return date.toLocaleDateString();
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const renderNotification = ({ item }: { item: Notification }) => {
    const config = TYPE_CONFIG[item.type];

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          { borderLeftColor: config.borderColor },
          !item.read && styles.unreadItem,
        ]}
        onPress={() => handleTap(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: config.iconBg }]}>
          <Ionicons name={config.icon as any} size={24} color={config.iconColor} />
        </View>

        <View style={styles.contentContainer}>
          <Text style={[styles.title, !item.read && styles.titleUnread]}>{item.title}</Text>
          <Text style={styles.message}>{item.message}</Text>
          <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
        </View>

        {!item.read && <View style={[styles.unreadDot, { backgroundColor: config.borderColor }]} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerRight}>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllAsRead} disabled={markingAll}>
              <Text style={[styles.markAllText, markingAll && styles.markAllDisabled]}>
                Mark all read
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.divider} />

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.brand]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.surface,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecond,
  },
  markAllDisabled: {
    opacity: 0.4,
  },
  closeText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.brand,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  listContent: {
    paddingVertical: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: Colors.surface,
    borderLeftWidth: 3,
    marginBottom: 1,
  },
  unreadItem: {
    backgroundColor: Colors.brandLight,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  titleUnread: {
    fontWeight: '700',
  },
  message: {
    fontSize: 14,
    color: Colors.textSecond,
    lineHeight: 20,
    marginBottom: 6,
  },
  time: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 8,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textMuted,
    marginTop: 16,
  },
});
