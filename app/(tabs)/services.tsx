import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';

const SERVICES = [
  { id: '1', icon: 'book-outline',        title: 'Book Borrowing',     desc: 'Borrow up to 3 books for 2 weeks.' },
  { id: '2', icon: 'bookmark-outline',    title: 'Book Reservation',   desc: 'Reserve a book currently on loan.' },
  { id: '3', icon: 'wifi-outline',        title: 'Internet Access',    desc: 'Free Wi-Fi and computer terminals.' },
  { id: '4', icon: 'print-outline',       title: 'Printing & Copying', desc: 'Print or photocopy documents on-site.' },
  { id: '5', icon: 'people-outline',      title: 'Study Rooms',        desc: 'Book a quiet study room for groups.' },
  { id: '6', icon: 'help-circle-outline', title: 'Reference Desk',     desc: 'Get help from our librarians.' },
];

export default function ServicesScreen() {
  return (
    <View style={styles.container}>
      <FlatList
        data={SERVICES}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <Ionicons name={item.icon as any} size={22} color={Colors.brand} />
            </View>
            <View style={styles.info}>
              <Text style={styles.title}>{item.title}</Text>
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
  title: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  desc: { fontSize: 12, color: Colors.textSecond, lineHeight: 18 },
});
