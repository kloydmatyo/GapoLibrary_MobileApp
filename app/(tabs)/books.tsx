import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Image, ScrollView, Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getBooks } from '@/lib/api';
import { useBookAvailability } from '@/context/BookAvailabilityContext';
import Colors from '@/constants/colors';

interface Book {
  _id: string;
  title: string;
  author: string;
  category: string;
  availableCopies: number;
  coverImageUrl?: string;
}

function LiveDot() {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);

  return (
    <Animated.View style={[styles.liveDot, { opacity: pulse }]} />
  );
}

export default function BooksScreen() {
  const router = useRouter();
  const { availability, updateBookAvailability } = useBookAvailability();
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchBooks = useCallback(async () => {
    try {
      const res = await getBooks({});
      const fetchedBooks = res.data.books;
      setAllBooks(fetchedBooks);
      fetchedBooks.forEach((book: Book) => updateBookAvailability(book._id));
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [updateBookAvailability]);

  useEffect(() => { fetchBooks(); }, []);

  // Debounced live search — filters locally, no extra API calls
  const handleSearchChange = (text: string) => {
    setSearch(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSelectedCategory('All'); // reset category when searching
    }, 300);
  };

  // Derive categories from loaded books
  const categories = ['All', ...Array.from(new Set(allBooks.map(b => b.category))).sort()];

  // Filter locally — instant, no network
  const filteredBooks = allBooks.filter(book => {
    const matchesSearch = !search.trim() ||
      book.title.toLowerCase().includes(search.toLowerCase()) ||
      book.author.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || book.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const renderItem = ({ item }: { item: Book }) => {
    const realtimeAvailability = availability[item._id];
    const availableCopies = realtimeAvailability?.availableCopies ?? item.availableCopies;
    const isStale = realtimeAvailability && (Date.now() - realtimeAvailability.lastUpdated > 60000);
    const isLive = realtimeAvailability && !isStale;

    return (
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
            <View style={styles.availContainer}>
              {isLive && <LiveDot />}
              <Text style={[styles.avail, { color: availableCopies > 0 ? Colors.success : Colors.error }]}>
                {availableCopies > 0 ? `${availableCopies} available` : 'Unavailable'}
              </Text>
            </View>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search — no button, filters as you type */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={Colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search title or author..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={handleSearchChange}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category chips */}
      {!loading && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {categories.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, selectedCategory === cat && styles.chipActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.chipText, selectedCategory === cat && styles.chipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {loading
        ? <ActivityIndicator style={{ marginTop: 40 }} size="large" color={Colors.brand} />
        : (
          <FlatList
            data={filteredBooks}
            keyExtractor={(b) => b._id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            onRefresh={() => { setRefreshing(true); fetchBooks(); }}
            refreshing={refreshing}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Ionicons name="search-outline" size={48} color={Colors.border} />
                <Text style={styles.empty}>No books found.</Text>
              </View>
            }
          />
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  searchIcon: { marginRight: 2 },
  searchInput: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  chips: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.brand,
    borderColor: Colors.brand,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecond,
  },
  chipTextActive: {
    color: '#fff',
  },
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  category: {
    fontSize: 11, color: Colors.textMuted, backgroundColor: '#f3f4f6',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  availContainer: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.brand,
  },
  avail: { fontSize: 11, fontWeight: '600' },
  emptyWrap: { alignItems: 'center', marginTop: 60, gap: 12 },
  empty: { textAlign: 'center', color: Colors.textMuted, fontSize: 14 },
});
