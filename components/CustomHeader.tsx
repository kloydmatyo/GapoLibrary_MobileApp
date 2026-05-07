import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, Image } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import Colors from '@/constants/colors';

export default function CustomHeader() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [notificationCount, setNotificationCount] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchNotificationCount = async () => {
      try {
        const response = await api.get('/notifications/unread-count');
        setNotificationCount(response.data.count || 0);
      } catch {
        // silently fail
      }
    };

    if (user) {
      fetchNotificationCount();
      const interval = setInterval(fetchNotificationCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Fetch profile image once on mount
  useEffect(() => {
    if (user) {
      api.get('/user/profile')
        .then((res) => setProfileImage(res.data.user?.profileImage || null))
        .catch(() => {});
    }
  }, [user]);

  const navigate = (route: string) => {
    setMenuVisible(false);
    router.push(route as any);
  };

  const handleSignOut = () => {
    setMenuVisible(false);
    signOut();
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
        <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/(tabs)/notifications' as any)}>
          <Ionicons name="notifications-outline" size={22} color={Colors.textPrimary} />
          {notificationCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{notificationCount > 99 ? '99+' : notificationCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.profileButton} onPress={() => setMenuVisible(true)}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Dropdown modal */}
      <Modal transparent visible={menuVisible} animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setMenuVisible(false)}>
          <View style={styles.dropdown}>
            {/* User info */}
            <View style={styles.dropdownHeader}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.dropdownAvatarImg} />
              ) : (
                <View style={styles.dropdownAvatar}>
                  <Text style={styles.dropdownAvatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={styles.dropdownUserInfo}>
                <Text style={styles.dropdownName} numberOfLines={1}>{user?.name}</Text>
                <Text style={styles.dropdownEmail} numberOfLines={1}>{user?.email}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Menu items */}
            {MENU_ITEMS.map((item) => (
              <TouchableOpacity key={item.label} style={styles.menuItem} onPress={() => navigate(item.route)}>
                <Ionicons name={item.icon as any} size={18} color={Colors.textSecond} />
                <Text style={styles.menuItemText}>{item.label}</Text>
              </TouchableOpacity>
            ))}

            <View style={styles.divider} />

            {/* Sign out */}
            <TouchableOpacity style={styles.menuItem} onPress={handleSignOut}>
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
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  leftSection: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.brandLight, justifyContent: 'center', alignItems: 'center',
  },
  title: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  subtitle: { fontSize: 11, color: Colors.textMuted },
  rightSection: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconButton: { position: 'relative', padding: 4 },
  badge: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: '#ec4899', borderRadius: 10,
    minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  profileButton: { marginLeft: 4 },
  avatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.brand, justifyContent: 'center', alignItems: 'center',
  },
  avatarImg: { width: 34, height: 34, borderRadius: 17 },
  avatarText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Modal
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-start', alignItems: 'flex-end',
    paddingTop: 60, paddingRight: 12,
  },
  dropdown: {
    backgroundColor: '#fff', borderRadius: 16, width: 260,
    elevation: 8, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16,
  },
  dropdownAvatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: Colors.brand, justifyContent: 'center', alignItems: 'center',
  },
  dropdownAvatarImg: { width: 42, height: 42, borderRadius: 21 },
  dropdownAvatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  dropdownUserInfo: { flex: 1 },
  dropdownName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  dropdownEmail: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 0 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 13,
  },
  menuItemText: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary },
});
