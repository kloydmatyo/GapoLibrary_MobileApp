import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';

const QUICK_ACTIONS = [
  { label: 'Browse Books', icon: 'book-outline', route: '/(tabs)/books' },
  { label: 'My History', icon: 'time-outline', route: '/(tabs)/history' },
  { label: 'My Profile', icon: 'person-outline', route: '/(tabs)/profile' },
] as const;

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0]} 👋</Text>
        <Text style={styles.subGreeting}>Welcome to GapoLibrary</Text>
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.grid}>
        {QUICK_ACTIONS.map((action) => (
          <TouchableOpacity
            key={action.label}
            style={styles.card}
            onPress={() => router.push(action.route as any)}
          >
            <Ionicons name={action.icon as any} size={32} color="#1a56db" />
            <Text style={styles.cardLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={20} color="#1a56db" />
        <Text style={styles.infoText}>
          Visit the library or use the web portal to borrow and return books.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4ff' },
  content: { padding: 20 },
  hero: { backgroundColor: '#1a56db', borderRadius: 16, padding: 24, marginBottom: 24 },
  greeting: { fontSize: 22, fontWeight: '700', color: '#fff' },
  subGreeting: { fontSize: 14, color: '#bfdbfe', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 20,
    alignItems: 'center', width: '47%', elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6,
  },
  cardLabel: { marginTop: 8, fontSize: 13, fontWeight: '600', color: '#374151', textAlign: 'center' },
  infoCard: {
    backgroundColor: '#eff6ff', borderRadius: 12, padding: 16,
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
  },
  infoText: { flex: 1, fontSize: 13, color: '#1e40af', lineHeight: 20 },
});
