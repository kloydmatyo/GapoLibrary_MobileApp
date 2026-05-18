import { View, Text, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import Colors, { Radius } from '@/constants/colors';
import { Fonts } from '@/constants/typography';

const cardShadow = {
  elevation: 2 as const,
  shadowColor: Colors.shadow,
  shadowOpacity: 0.05,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 2 },
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // Reload image every time the tab is focused (e.g. after updating in Settings)
  useFocusEffect(
    useCallback(() => {
      api.get('/user/profile')
        .then((res) => setProfileImage(res.data.user?.profileImage || null))
        .catch(() => {});
    }, [])
  );

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const ROLE_LABEL = { admin: 'Administrator', staff: 'Library Staff', user: 'Patron' };

  return (
    <View style={styles.container}>
      <View style={styles.avatarWrap}>
        {profileImage ? (
          <Image source={{ uri: profileImage }} style={styles.avatarImg} />
        ) : (
          <LinearGradient colors={[Colors.accent, Colors.accentDark]} style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
          </LinearGradient>
        )}
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{ROLE_LABEL[user?.role ?? 'user']}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <Ionicons name="card-outline" size={18} color={Colors.textSecond} />
          <Text style={styles.label}>Patron ID</Text>
          <Text style={styles.value}>{user?.patronId}</Text>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.editBtn} 
        onPress={() => router.push('/settings')}
      >
        <Ionicons name="settings-outline" size={20} color={Colors.accent} />
        <Text style={styles.editText}>Settings</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.rateBtn} 
        onPress={() => router.push('/rate')}
      >
        <Ionicons name="star-outline" size={20} color={Colors.accent} />
        <Text style={styles.rateText}>Rate a Librarian</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={Colors.error} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 24 },
  avatarWrap: { alignItems: 'center', marginBottom: 8 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
    ...cardShadow,
  },
  avatarImg: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
  avatarText: { fontSize: 32, fontFamily: Fonts.heading, color: '#fff' },
  name: { fontSize: 20, fontFamily: Fonts.heading, color: Colors.textPrimary },
  email: { fontSize: 14, fontFamily: Fonts.body, color: Colors.textSecond, marginTop: 2 },
  roleBadge: {
    marginTop: 8, backgroundColor: Colors.accentMuted,
    paddingHorizontal: 14, paddingVertical: 5, borderRadius: Radius.inner,
  },
  roleText: {
    color: Colors.accentDark, fontSize: 12, fontFamily: Fonts.bodyBold,
    letterSpacing: 0.3, textTransform: 'uppercase',
  },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.container, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: Colors.border, ...cardShadow,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { flex: 1, fontSize: 14, fontFamily: Fonts.bodyMedium, color: Colors.textSecond },
  value: { fontSize: 14, fontFamily: Fonts.bodySemiBold, color: Colors.textPrimary },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.accentMuted, borderRadius: Radius.container, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  editText: { color: Colors.accentDark, fontFamily: Fonts.bodySemiBold, fontSize: 15 },
  rateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.surface, borderRadius: Radius.container, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.border, ...cardShadow,
  },
  rateText: { color: Colors.textPrimary, fontFamily: Fonts.bodySemiBold, fontSize: 15 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.errorBg, borderRadius: Radius.container, padding: 14,
    borderWidth: 1, borderColor: Colors.error,
  },
  logoutText: { color: Colors.error, fontFamily: Fonts.bodySemiBold, fontSize: 15 },
});
