import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView, Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getBooks } from '@/lib/api';
import { useBookAvailability } from '@/context/BookAvailabilityContext';
import Colors, { Radius } from '@/constants/colors';
import { Fonts } from '@/constants/typography';
import BookCover from '@/components/BookCover';

interface Book {
  _id: string;
  title: string;
  author: string;
  category: string;
  availableCopies: number;
  isbn?: string;
  coverImageUrl?: string;
}

function LiveDot() {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    ).start();
  }, [pulse]);

  return <Animated.View style={[styles.liveDot, { opacity: pulse }]} />;
}

export default function BooksScreen() {
  const router = useRouter();
  const { availability, updateBookAvailability } = useBookAvailability();
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [availableOnly, setAvailableOnly] = useState(false);
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

  const handleSearchChange = (text: string) => {
    setSearch(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSelectedCategory('All');
    }, 300);
  };

  const categories = ['All', ...Array.from(new Set(allBooks.map((b) => b.category))).sort()];

  const filteredBooks = allBooks.filter((book) => {
    const matchesSearch = !search.trim() ||
      book.title.toLowerCase().includes(search.toLowerCase()) ||
      book.author.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || book.category === selectedCategory;
    const realtimeCopies = availability[book._id]?.availableCopies ?? book.availableCopies;
    const matchesAvailability = !availableOnly || realtimeCopies > 0;
    return matchesSearch && matchesCategory && matchesAvailability;
  });

  const renderItem = ({ item }: { item: Book }) => {
    const realtimeAvailability = availability[item._id];
    const availableCopies = realtimeAvailability?.availableCopies ?? item.availableCopies;
    const isStale = realtimeAvailability && (Date.now() - realtimeAvailability.lastUpdated > 60000);
    const isLive = realtimeAvailability && !isStale;

    return (
      <TouchableOpacity style={styles.item} onPress={() => router.push(`/books/${item._id}` as any)}>
        <BookCover
          isbn={item.isbn}
          coverImageUrl={item.coverImageUrl}
          width={48}
          height={64}
        />
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.author}>{item.author}</Text>
          <View style={styles.row}>
            <Text style={styles.category}>{item.category}</Text>
            <View style={styles.availContainer}>
              {isLive && <LiveDot />}
              <Text
                style={[
                  styles.avail,
                  { color: availableCopies > 0 ? Colors.accent : Colors.textMuted },
                ]}
              >
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

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.availToggle, availableOnly && styles.availToggleActive]}
          onPress={() => setAvailableOnly((v) => !v)}
        >
          <Ionicons
            name={availableOnly ? 'checkmark-circle' : 'ellipse-outline'}
            size={16}
            color={availableOnly ? '#fff' : Colors.textSecond}
          />
          <Text style={[styles.availToggleText, availableOnly && styles.availToggleTextActive]}>
            Available only
          </Text>
        </TouchableOpacity>
        {(search || selectedCategory !== 'All' || availableOnly) && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => { setSearch(''); setSelectedCategory('All'); setAvailableOnly(false); }}
          >
            <Text style={styles.clearBtnText}>Clear filters</Text>
          </TouchableOpacity>
        )}
      </View>

      {!loading && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScrollView}
          contentContainerStyle={styles.chips}
        >
          {categories.map((cat) => (
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

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={Colors.accent} />
      ) : filteredBooks.length === 0 ? (
        <View style={styles.emptyFull}>
          <Text style={styles.emptyTitle}>No books match your search</Text>
          <Text style={styles.emptyBody}>Try a different title, author, or category.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredBooks}
          keyExtractor={(b) => b._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          onRefresh={() => { setRefreshing(true); fetchBooks(); }}
          refreshing={refreshing}
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
    marginBottom: 8,
    paddingHorizontal: 14,
    backgroundColor: Colors.surface,
    borderRadius: Radius.container,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  searchIcon: { marginRight: 2 },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.textPrimary,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  availToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.container,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    height: 34,
  },
  availToggleActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  availToggleText: {
    fontSize: 13,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textSecond,
  },
  availToggleTextActive: { color: '#fff' },
  clearBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  clearBtnText: {
    fontSize: 12,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.accent,
  },
  chipsScrollView: { flexGrow: 0, flexShrink: 0 },
  chips: { paddingHorizontal: 16, paddingBottom: 12, gap: 8, alignItems: 'center' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.container,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 34,
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  chipText: {
    fontSize: 13,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textSecond,
  },
  chipTextActive: { color: '#fff' },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  item: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.container,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
    borderLeftColor: Colors.accent,
  },
  info: { flex: 1 },
  title: {
    fontSize: 14,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  author: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: Colors.textSecond,
    marginBottom: 6,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  category: {
    fontSize: 11,
    fontFamily: Fonts.bodyMedium,
    color: Colors.textMuted,
    backgroundColor: Colors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.inner,
  },
  availContainer: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent },
  avail: { fontSize: 11, fontFamily: Fonts.bodySemiBold },
  emptyFull: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  emptyTitle: {
    fontSize: 18,
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.textSecond,
    textAlign: 'center',
    lineHeight: 21,
  },
});
