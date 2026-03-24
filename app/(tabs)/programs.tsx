import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';

const PROGRAMS = [
  { id: '1', title: 'Summer Reading Challenge', date: 'June 1 – July 31', desc: 'Read 10 books and earn a certificate.' },
  { id: '2', title: 'Story Time for Kids',       date: 'Every Saturday, 10 AM', desc: 'Interactive storytelling for ages 4–8.' },
  { id: '3', title: 'Book Club',                  date: 'First Friday of the month', desc: 'Monthly discussion for adult readers.' },
  { id: '4', title: 'Author Talk Series',         date: 'Quarterly',               desc: 'Meet local and national authors.' },
];

export default function ProgramsScreen() {
  return (
    <View style={styles.container}>
      <FlatList
        data={PROGRAMS}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <Ionicons name="calendar-outline" size={22} color={Colors.brand} />
            </View>
            <View style={styles.info}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.date}>{item.date}</Text>
              <Text style={styles.desc}>{item.desc}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { padding: 16 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 12, padding: 14, marginBottom: 10,
    flexDirection: 'row', gap: 12, elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4,
  },
  iconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.brandLight, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2 },
  date: { fontSize: 12, color: Colors.brand, fontWeight: '600', marginBottom: 4 },
  desc: { fontSize: 12, color: Colors.textSecond, lineHeight: 18 },
});
