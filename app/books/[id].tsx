import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image,
  ActivityIndicator, Alert, TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getBook, createReservation } from '@/lib/api';
import Colors from '@/constants/colors';

interface Book {
  _id: string;
  title: string;
  author: string;
  category: string;
  section?: string;
  isbn?: string;
  publisher?: string;
  publicationYear?: number;
  description?: string;
  totalCopies: number;
  availableCopies: number;
  isEbook: boolean;
  ebookUrl?: string;
  coverImageUrl?: string;
}

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);

  useEffect(() => {
    getBook(id)
      .then((res) => setBook(res.data.book))
      .catch(() => Alert.alert('Error', 'Could not load book details.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleReserve = async () => {
    setReserving(true);
    try {
      await createReservation(id);
      Alert.alert('Reserved', 'Your reservation has been placed.');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Could not place reservation.');
    } finally {
      setReserving(false);
    }
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 60 }} size="large" color={Colors.brand} />;
  if (!book) return <Text style={styles.empty}>Book not found.</Text>;

  const available = book.availableCopies > 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.coverWrap}>
        {book.coverImageUrl
          ? <Image source={{ uri: book.coverImageUrl }} style={styles.cover} resizeMode="cover" />
          : <Ionicons name="book" size={64} color={Colors.brand} />}
      </View>

      <Text style={styles.title}>{book.title}</Text>
      <Text style={styles.author}>by {book.author}</Text>

      <View style={styles.badges}>
        <View style={styles.badge}><Text style={styles.badgeText}>{book.category}</Text></View>
        {book.section && <View style={styles.badge}><Text style={styles.badgeText}>{book.section}</Text></View>}
        {book.isEbook && (
          <View style={[styles.badge, { backgroundColor: Colors.warningBg }]}>
            <Text style={[styles.badgeText, { color: Colors.warning }]}>eBook</Text>
          </View>
        )}
      </View>

      <View style={styles.card}>
        {[
          ['Available Copies', `${book.availableCopies} / ${book.totalCopies}`],
          book.isbn && ['ISBN', book.isbn],
          book.publisher && ['Publisher', book.publisher],
          book.publicationYear && ['Year', String(book.publicationYear)],
        ].filter(Boolean).map(([label, value]) => (
          <View key={label as string} style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            <Text style={[styles.value, label === 'Available Copies' && { color: available ? Colors.success : Colors.error, fontWeight: '700' }]}>
              {value}
            </Text>
          </View>
        ))}
      </View>

      {book.description && (
        <View style={styles.descCard}>
          <Text style={styles.descTitle}>Description</Text>
          <Text style={styles.desc}>{book.description}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.reserveBtn, !available && styles.disabledBtn]}
        onPress={handleReserve}
        disabled={!available || reserving}
      >
        {reserving
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.reserveText}>{available ? 'Reserve Book' : 'Not Available'}</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20 },
  coverWrap: {
    width: 120, height: 160, borderRadius: 10, backgroundColor: Colors.brandLight,
    justifyContent: 'center', alignItems: 'center', alignSelf: 'center',
    marginBottom: 16, overflow: 'hidden', elevation: 4,
  },
  cover: { width: '100%', height: '100%' },
  title: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', marginBottom: 4 },
  author: { fontSize: 14, color: Colors.textSecond, textAlign: 'center', marginBottom: 12 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 16 },
  badge: { backgroundColor: Colors.brandLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, color: Colors.brand, fontWeight: '600' },
  card: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: 16, marginBottom: 12,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  label: { fontSize: 13, color: Colors.textSecond },
  value: { fontSize: 13, color: Colors.textPrimary, fontWeight: '500' },
  descCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, marginBottom: 16, elevation: 2 },
  descTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  desc: { fontSize: 13, color: '#4b5563', lineHeight: 20 },
  reserveBtn: { backgroundColor: Colors.brand, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 20 },
  disabledBtn: { backgroundColor: Colors.textMuted },
  reserveText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  empty: { textAlign: 'center', marginTop: 60, color: Colors.textMuted },
});
