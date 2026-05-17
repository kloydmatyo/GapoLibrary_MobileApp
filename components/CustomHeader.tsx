import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, Image, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
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

const TYPE_CONFIG: Record<Notification['type'], { icon: string; accentColor: string; iconBg: string; iconColor: string }> = {
  overdue:           { icon: 'alert-circle',     accentColor: Colors.error,  iconBg: Colors.errorBg,   iconColor: Colors.error  },
  reservation_ready: { icon: 'time',              accentColor: Colors.accent, iconBg: Colors.accentMuted, iconColor: Colors.accent },
  pickup_confirmed:  { icon: 'checkmark-circle',  accentColor: Colors.accent, iconBg: Colors.accentMuted, iconColor: Colors.accent },
  borrow_request:    { icon: 'book',              accentColor: Colors.accent, iconBg: Colors.accentMuted, iconColor: Colors.accent },
  returned:          { icon: 'checkmark-done',    accentColor: Colors.statusReturned, iconBg: Colors.statusReturnedBg, iconColor: Colors.statusReturned },
  general:           { icon: 'information-circle', accentColor: Colors.textMuted, iconBg: Colors.surfaceMuted, iconColor: Colors.textSecond },
};

function formatTime(dateString: string) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const m = Math.floor(diffMs / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d < 7) return `${d}d ago`;
  return new Date(dateString).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

export default function CustomHeader() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const [notifVisible, setNotifVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Poll unread count
  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      try {
        const res = await api.get('/notifications/unread-count');
        setUnreadCount(res.data.count || 0);
      } catch {}
    };
    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Fetch profile image
  useEffect(() => {
    if (user) {
      api.get('/user/profile')
        .then((res) => setProfileImage(res.data.user?.profileImage || null))
        .catch(() => {});
    }
  }, [user]);

  const openNotifications = useCallback(async () => {
    setNotifVisible(true);
    setNotifLoading(true);
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications || []);
    } catch {}
    finally { setNotifLoading(false); }
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const navigate = (route: string) => {
    setMenuVisible(false);
    router.push(route as any);
  };

  const MENU_ITEMS = [
    { icon: 'settings-outline', label: 'Settings', route: '/settings' },
  ];

  return (
    <View style={styles.container}>
      {/* Left: Logo */}
      <View style={styles.leftSection}>
        <View style={styles.logoWrap}>
          <Ionicons name="book" size={24} color={Colors.brand} />
        </View>
        <View>
          <Text style={styles.title}>GapoLibrary</Text>
          <Text style={styles.subtitle}>Olongapo City</Text>
        </View>
      </View>

      {/* Right: bell + avatar */}
      <View style={styles.rightSection}>
        <TouchableOpacity style={styles.iconButton} onPress={openNotifications}>
          <Ionicons name="notifications-outline" size={22} color={Colors.textPrimary} />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.profileButton} onPress={() => setMenuVisible(true)}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.avatarImg} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: Colors.accent }]}>
              <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Notification dropdown ── */}
      <Modal transparent visible={notifVisible} animationType="fade" onRequestClose={() => setNotifVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setNotifVisible(false)}>
          <Pressable style={styles.notifDropdown} onPress={() => {}}>
            {/* Header */}
            <View style={styles.notifHeader}>
              <Text style={styles.notifTitle}>Notifications</Text>
              {notifications.some(n => !n.read) && (
                <TouchableOpacity onPress={markAllAsRead}>
                  <Text style={styles.markAllText}>Mark all read</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.divider} />

            {/* List */}
            {notifLoading ? (
              <ActivityIndicator color={Colors.brand} style={{ paddingVertical: 24 }} />
            ) : notifications.length === 0 ? (
              <View style={styles.notifEmpty}>
                <Text style={styles.notifEmptyText}>No notifications yet</Text>
              </View>
            ) : (
              <ScrollView style={styles.notifScroll} showsVerticalScrollIndicator={false}>
                {notifications.map((item, index) => {
                  const cfg = TYPE_CONFIG[item.type];
                  return (
                    <TouchableOpacity
                      key={item._id}
                      style={[styles.notifItem, index < notifications.length - 1 && styles.notifItemBorder]}
                      onPress={() => { markAsRead(item._id); setNotifVisible(false); }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.notifAccent, { backgroundColor: cfg.accentColor }]} />
                      <View style={[styles.notifIcon, { backgroundColor: cfg.iconBg }]}>
                        <Ionicons name={cfg.icon as any} size={18} color={cfg.iconColor} />
                      </View>
                      <View style={styles.notifContent}>
                        <Text style={[styles.notifItemTitle, !item.read && styles.notifItemTitleUnread]} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={styles.notifItemMsg} numberOfLines={2}>{item.message}</Text>
                        <Text style={styles.notifItemTime}>{formatTime(item.createdAt)}</Text>
                      </View>
                      {!item.read && <View style={[styles.unreadDot, { backgroundColor: cfg.accentColor }]} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Profile dropdown ── */}
      <Modal transparent visible={menuVisible} animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setMenuVisible(false)}>
          <View style={styles.dropdown}>
            <View style={styles.dropdownHeader}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.dropdownAvatarImg} />
              ) : (
                <View style={[styles.dropdownAvatar, { backgroundColor: Colors.accent }]}>
                  <Text style={styles.dropdownAvatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={styles.dropdownUserInfo}>
                <Text style={styles.dropdownName} numberOfLines={1}>{user?.name}</Text>
                <Text style={styles.dropdownEmail} numberOfLines={1}>{user?.email}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            {MENU_ITEMS.map((item) => (
              <TouchableOpacity key={item.label} style={styles.menuItem} onPress={() => navigate(item.route)}>
                <Ionicons name={item.icon as any} size={18} color={Colors.textSecond} />
                <Text style={styles.menuItemText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
            <View style={styles.divider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); signOut(); }}>
              <Ionicons name="log-out-outline" size={18} color={Colors.error} />
              <Text style={[styles.menuItemText, { color: Colors.error }]}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  leftSection: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoWrap: { width: 40, height: 40, borderRadius: 8, backgroundColor: Colors.accentMuted, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  subtitle: { fontSize: 11, color: Colors.textMuted },
  rightSection: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconButton: { position: 'relative', padding: 4 },
  badge: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: Colors.error, borderRadius: 8,
    minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  profileButton: { marginLeft: 4 },
  avatar: { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  avatarImg: { width: 34, height: 34, borderRadius: 8 },
  avatarText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Shared overlay
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-start', alignItems: 'flex-end',
    paddingTop: 60, paddingRight: 12,
  },
  divider: { height: 1, backgroundColor: '#f3f4f6' },

  // Notification dropdown
  notifDropdown: {
    backgroundColor: Colors.surface, borderRadius: 8, width: 320,
    elevation: 10, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
    overflow: 'hidden', maxHeight: 440,
  },
  notifHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  notifTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  markAllText: { fontSize: 12, fontWeight: '700', color: Colors.brand },
  notifScroll: { maxHeight: 360 },
  notifEmpty: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  notifEmptyText: { fontSize: 13, color: Colors.textMuted, fontWeight: '600' },
  notifItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingRight: 14,
    backgroundColor: '#fff',
  },
  notifItemBorder: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  notifAccent: { width: 3, alignSelf: 'stretch', borderRadius: 2, marginRight: 10 },
  notifIcon: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center', marginRight: 10, flexShrink: 0,
  },
  notifContent: { flex: 1 },
  notifItemTitle: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, marginBottom: 2 },
  notifItemTitleUnread: { fontWeight: '800' },
  notifItemMsg: { fontSize: 12, color: Colors.textSecond, lineHeight: 16, marginBottom: 3 },
  notifItemTime: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8, flexShrink: 0 },

  // Profile dropdown
  dropdown: {
    backgroundColor: Colors.surface, borderRadius: 8, width: 260,
    elevation: 8, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, overflow: 'hidden',
  },
  dropdownHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  dropdownAvatar: { width: 42, height: 42, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  dropdownAvatarImg: { width: 42, height: 42, borderRadius: 8 },
  dropdownAvatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  dropdownUserInfo: { flex: 1 },
  dropdownName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  dropdownEmail: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
  menuItemText: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary },
});
