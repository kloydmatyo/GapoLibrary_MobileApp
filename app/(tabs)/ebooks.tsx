import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Image, Alert, Linking, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getBooks } from '@/lib/api';
import Colors from '@/constants/colors';

interface Ebook {
  _id: string;
  title: string;
  author: string;
  category: string;
  description?: string;
  ebookUrl?: string;
  coverImageUrl?: string;
  isEbook: boolean;
}

export default function EbooksScreen() {
  const router = useRouter();
  const [ebooks, setEbooks] = useState<Ebook[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');

  const fetchEbooks = useCallback(async (q?: string) => {
    try {
      const res = await getBooks(q ? { search: q } : {});
      const allBooks = res.data.books;
      // Filter only eBooks
      const ebooksOnly = allBooks.filter((book: Ebook) => book.isEbook);
      setEbooks(ebooksOnly);
    } catch (error) {
      console.error('Failed to fetch ebooks:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Extract unique categories
  const categories = ['All', ...Array.from(new Set(ebooks.map((b) => b.category)))];

  // Filter by category and search
  const filteredEbooks = ebooks.filter((book) => {
    const matchesCategory = activeCategory === 'All' || book.category === activeCategory;
    const matchesSearch =
      !search ||
      book.title.toLowerCase().includes(search.toLowerCase()) ||
      book.author.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  useEffect(() => {
    fetchEbooks();
  }, []);

  const onSearch = () => {
    setActiveCategory('All'); // Reset category when searching
    fetchEbooks(search.trim() || undefined);
  };

  const handleReadOnline = (ebook: Ebook) => {
    if (!ebook.ebookUrl) {
      Alert.alert('Not Available', 'This eBook does not have a reading link.');
      return;
    }
    // Open URL directly
    Linking.openURL(ebook.ebookUrl).catch(() => {
      Alert.alert('Error', 'Could not open the eBook link.');
    });
  };

  const renderItem = ({ item }: { item: Ebook }) => (
    <View style={styles.card}>
      {/* Cover */}
      <View style={styles.coverContainer}>
        {item.coverImageUrl ? (
          <Image source={{ uri: item.coverImageUrl }} style={styles.coverImage} />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Ionicons name="book" size={40} color={Colors.brand} />
          </View>
        )}
        <View style={styles.ebookBadge}>
          <Text style={styles.ebookBadgeText}>eBook</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.category}>{item.category}</Text>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.author}>{item.author}</Text>
        
        {item.description && (
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.readButton}
            onPress={() => handleReadOnline(item)}
          >
            <Ionicons name="open-outline" size={18} color="#fff" />
            <Text style={styles.readButtonText}>Read Online</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.detailsButton}
            onPress={() => router.push(`/books/${item._id}` as any)}
          >
            <Text style={styles.detailsButtonText}>Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Info Banner */}
      <View style={styles.banner}>
        <Ionicons name="information-circle" size={20} color={Colors.brand} />
        <Text style={styles.bannerText}>Read online — no borrowing needed</Text>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search eBooks..."
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={onSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={onSearch}>
          <Ionicons name="search" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Count */}
      {!loading && (
        <View style={styles.countContainer}>
          <Ionicons name="book-outline" size={18} color={Colors.brand} />
          <Text style={styles.countText}>
            {filteredEbooks.length} {filteredEbooks.length === 1 ? 'eBook' : 'eBooks'} available
          </Text>
        </View>
      )}

      {/* Category Filter */}
      {!loading && categories.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScrollView}
          contentContainerStyle={styles.categoryScroll}
        >
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                onPress={() => setActiveCategory(cat)}
              >
                <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* List */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={Colors.brand} />
      ) : (
        <FlatList
          data={filteredEbooks}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          onRefresh={() => {
            setRefreshing(true);
            fetchEbooks(search || undefined);
          }}
          refreshing={refreshing}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="book-outline" size={64} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No eBooks found</Text>
              <Text style={styles.emptyText}>Try a different search or category</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.brandMuted, paddingHorizontal: 16, paddingVertical: 12,
    marginHorizontal: 16, marginTop: 16, borderRadius: 16,
  },
  bannerText: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.brandDark },
  searchRow: { flexDirection: 'row', padding: 16, gap: 8 },
  searchInput: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: Colors.border, fontSize: 14, fontWeight: '500',
    elevation: 3, shadowColor: Colors.shadow, shadowOpacity: 0.07, shadowRadius: 6,
  },
  searchBtn: {
    backgroundColor: Colors.brandDarker, borderRadius: 16, padding: 12,
    justifyContent: 'center',
    elevation: 4, shadowColor: '#2e7d32', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  countContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingBottom: 8 },
  countText: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },
  categoryScrollView: { flexGrow: 0, flexShrink: 0 },
  categoryScroll: { paddingHorizontal: 16, paddingBottom: 12, gap: 8, alignItems: 'center' },
  categoryChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
    height: 34, justifyContent: 'center',
  },
  categoryChipActive: { backgroundColor: Colors.brand, borderColor: Colors.brand },
  categoryChipText: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  categoryChipTextActive: { color: '#fff' },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 20, marginBottom: 16, overflow: 'hidden',
    elevation: 5, shadowColor: Colors.shadow, shadowOpacity: 0.10, shadowRadius: 10, shadowOffset: { width: 0, height: 5 },
  },
  coverContainer: { position: 'relative', height: 180, backgroundColor: Colors.brandLight, justifyContent: 'center', alignItems: 'center' },
  coverImage: { width: '100%', height: '100%' },
  coverPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  ebookBadge: {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: Colors.brandDarker, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  ebookBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoContainer: { padding: 16 },
  category: { fontSize: 11, fontWeight: '800', color: Colors.brand, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  title: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  author: { fontSize: 14, fontWeight: '700', color: Colors.textSecond, marginBottom: 8 },
  description: { fontSize: 13, color: Colors.textSecond, lineHeight: 18, marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 8 },
  readButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.brandDarker, paddingVertical: 13, borderRadius: 14,
    elevation: 4, shadowColor: '#2e7d32', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  readButtonText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  detailsButton: {
    paddingHorizontal: 16, paddingVertical: 13, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border, justifyContent: 'center',
  },
  detailsButtonText: { color: Colors.textPrimary, fontSize: 14, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: Colors.textMuted, fontWeight: '600' },
});
