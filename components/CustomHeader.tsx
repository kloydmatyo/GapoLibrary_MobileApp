import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import Colors from '@/constants/colors';

interface CustomHeaderProps {}

export default function CustomHeader({}: CustomHeaderProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    const fetchNotificationCount = async () => {
      try {
        const response = await api.get('/notifications/unread-count');
        setNotificationCount(response.data.count || 0);
      } catch (error) {
        console.error('Failed to fetch notification count:', error);
      }
    };

    if (user) {
      fetchNotificationCount();
      // Refresh count every 30 seconds
      const interval = setInterval(fetchNotificationCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  return (
    <View style={styles.container}>
      {/* Left: Logo and Title */}
      <View style={styles.leftSection}>
        <View style={styles.logoWrap}>
          <Ionicons name="book" size={24} color={Colors.brand} />
        </View>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>GapoLibrary</Text>
          <Text style={styles.subtitle}>Olongapo City</Text>
        </View>
      </View>

      {/* Right: Icons */}
      <View style={styles.rightSection}>
        {/* Notifications */}
        <TouchableOpacity 
          style={styles.iconButton}
          onPress={() => router.push('/(tabs)/notifications')}
        >
          <Ionicons name="notifications-outline" size={22} color={Colors.textPrimary} />
          {notificationCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{notificationCount > 99 ? '99+' : notificationCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Profile */}
        <TouchableOpacity style={styles.profileButton}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.brandLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleWrap: {
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconButton: {
    position: 'relative',
    padding: 4,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#ec4899',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  profileButton: {
    marginLeft: 4,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.brand,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
