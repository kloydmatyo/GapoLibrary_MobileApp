import { View, Text, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import Colors from '@/constants/colors';

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
          <LinearGradient colors={['#2e7d32', '#15803d']} style={styles.avatar}>
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
        <Ionicons name="settings-outline" size={20} color={Colors.brand} />
        <Text style={styles.editText}>Settings</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.rateBtn} 
        onPress={() => router.push('/rate')}
      >
        <Ionicons name="star-outline" size={20} color="#f59e0b" />
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
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
    elevation: 6, shadowColor: '#2e7d32', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
  },
  avatarImg: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#fff' },
  name: { fontSize: 20, fontWeight: '900', color: Colors.textPrimary },
  email: { fontSize: 14, color: Colors.textSecond, marginTop: 2, fontWeight: '500' },
  roleBadge: { marginTop: 8, backgroundColor: Colors.brandMuted, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  roleText: { color: Colors.brandDarker, fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 20, padding: 16, marginBottom: 16,
    elevation: 4, shadowColor: Colors.shadow, shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { flex: 1, fontSize: 14, color: Colors.textSecond, fontWeight: '600' },
  value: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.brandMuted, borderRadius: 14, padding: 14, marginBottom: 12,
    elevation: 2, shadowColor: Colors.brand, shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
  },
  editText: { color: Colors.brandDarker, fontWeight: '800', fontSize: 15 },
  rateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#fef3c7', borderRadius: 14, padding: 14, marginBottom: 12,
    elevation: 2, shadowColor: '#f59e0b', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
  },
  rateText: { color: '#d97706', fontWeight: '800', fontSize: 15 },
  chatBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#f5f3ff', borderRadius: 14, padding: 14, marginBottom: 12,
  },
  chatText: { color: '#7c3aed', fontWeight: '800', fontSize: 15 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.errorBg, borderRadius: 14, padding: 14,
  },
  logoutText: { color: Colors.error, fontWeight: '800', fontSize: 15 },
});
