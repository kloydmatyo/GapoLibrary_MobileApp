import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getBooks } from '@/lib/api';
import Colors from '@/constants/colors';

interface Book {
  _id: string;
  title: string;
  author: string;
  category: string;
  availableCopies: number;
  coverImageUrl?: string;
}

export default function BooksScreen() {
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBooks = useCallback(async (q?: string) => {
    try {
      const res = await getBooks(q ? { search: q } : {});
      setBooks(res.data.books);
    } catch {
      // silently fail — user sees empty list
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchBooks(); }, []);

  const onSearch = () => fetchBooks(search.trim() || undefined);

  const renderItem = ({ item }: { item: Book }) => (
    <TouchableOpacity style={styles.item} onPress={() => router.push(`/books/${item._id}` as any)}>
      <View style={styles.cover}>
        {item.coverImageUrl
          ? <Image source={{ uri: item.coverImageUrl }} style={styles.coverImg} />
          : <Ionicons name="book" size={28} color={Colors.brand} />}
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.author}>{item.author}</Text>
        <View style={styles.row}>
          <Text style={styles.category}>{item.category}</Text>
          <Text style={[styles.avail, { color: item.availableCopies > 0 ? Colors.success : Colors.error }]}>
            {item.availableCopies > 0 ? `${item.availableCopies} available` : 'Unavailable'}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search title or author..."
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={onSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={onSearch}>
          <Ionicons name="search" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading
        ? <ActivityIndicator style={{ marginTop: 40 }} size="large" color={Colors.brand} />
        : (
          <FlatList
            data={books}
            keyExtractor={(b) => b._id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            onRefresh={() => { setRefreshing(true); fetchBooks(search || undefined); }}
            refreshing={refreshing}
            ListEmptyComponent={<Text style={styles.empty}>No books found.</Text>}
          />
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchRow: { flexDirection: 'row', padding: 16, gap: 8 },
  searchInput: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: Colors.border, fontSize: 14,
  },
  searchBtn: { backgroundColor: Colors.brand, borderRadius: 10, padding: 10, justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  item: {
    backgroundColor: Colors.surface, borderRadius: 12, padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4,
  },
  cover: {
    width: 52, height: 68, borderRadius: 6, backgroundColor: Colors.brandLight,
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  coverImg: { width: '100%', height: '100%' },
  info: { flex: 1 },
  title: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 2 },
  author: { fontSize: 12, color: Colors.textSecond, marginBottom: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  category: { fontSize: 11, color: Colors.textMuted, backgroundColor: '#f3f4f6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  avail: { fontSize: 11, fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 40, color: Colors.textMuted },
});
