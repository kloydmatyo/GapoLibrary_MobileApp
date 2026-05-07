import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import Colors from '@/constants/colors';

const QUICK_ACTIONS = [
  { label: 'Events', icon: 'calendar-outline', route: '/events' },
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

      {QUICK_ACTIONS.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.grid}>
            {QUICK_ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.label}
                style={styles.card}
                onPress={() => router.push(action.route as any)}
              >
                <Ionicons name={action.icon as any} size={32} color={Colors.brand} />
                <Text style={styles.cardLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20 },
  hero: { backgroundColor: Colors.brand, borderRadius: 16, padding: 24, marginBottom: 24 },
  greeting: { fontSize: 22, fontWeight: '700', color: '#fff' },
  subGreeting: { fontSize: 14, color: Colors.primary[200], marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: 20,
    alignItems: 'center', width: '47%', elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6,
  },
  cardLabel: { marginTop: 8, fontSize: 13, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center' },
  infoCard: {
    backgroundColor: Colors.brandMuted, borderRadius: 12, padding: 16,
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
  },
  infoText: { flex: 1, fontSize: 13, color: Colors.brandDark, lineHeight: 20 },
});
