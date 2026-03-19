import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

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
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{ROLE_LABEL[user?.role ?? 'user']}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <Ionicons name="card-outline" size={18} color="#6b7280" />
          <Text style={styles.label}>Patron ID</Text>
          <Text style={styles.value}>{user?.patronId}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#dc2626" />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4ff', padding: 24 },
  avatarWrap: { alignItems: 'center', marginBottom: 28 },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#1a56db',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#fff' },
  name: { fontSize: 20, fontWeight: '700', color: '#111827' },
  email: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  roleBadge: { marginTop: 8, backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  roleText: { color: '#1a56db', fontSize: 12, fontWeight: '600' },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { flex: 1, fontSize: 14, color: '#6b7280' },
  value: { fontSize: 14, fontWeight: '600', color: '#111827' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#fef2f2', borderRadius: 12, padding: 14,
  },
  logoutText: { color: '#dc2626', fontWeight: '600', fontSize: 15 },
});
