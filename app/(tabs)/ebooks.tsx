import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getBooks } from '@/lib/api';
import Colors, { Radius } from '@/constants/colors';
import { Fonts } from '@/constants/typography';
import { resolveCoverUri, openLibraryCoverByTitle } from '@/lib/covers';

interface Ebook {
  _id: string;
  title: string;
  author: string;
  category: string;
  description?: string;
  isbn?: string;
  ebookUrl?: string;
  coverImageUrl?: string;
  isEbook: boolean;
}

/** Small thumbnail — same size as catalog row covers. */
function EbookCover({ coverImageUrl, isbn, title }: {
  coverImageUrl?: string | null;
  isbn?: string | null;
  title: string;
}) {
  const initial = resolveCoverUri(coverImageUrl, isbn, title);
  const [uri, setUri] = useState<string | null>(initial);
  const [failed, setFailed] = useState(false);

  if (!uri || failed) {
    return <View style={coverStyles.empty} />;
  }

  return (
    <Image
      source={{ uri }}
      style={coverStyles.image}
      resizeMode="cover"
      onError={() => {
        const titleFallback = openLibraryCoverByTitle(title);
        if (titleFallback && titleFallback !== uri) {
          setUri(titleFallback);
        } else {
          setFailed(true);
        }
      }}
    />
  );
}

const coverStyles = StyleSheet.create({
  image: { width: 48, height: 64, borderRadius: Radius.inner },
  empty: {
    width: 48, height: 64, borderRadius: Radius.inner,
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1, borderColor: Colors.border,
  },
});

export default function EbooksScreen() {
  const router = useRouter();
  const [ebooks, setEbooks] = useState<Ebook[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchEbooks = useCallback(async () => {
    try {
      const res = await getBooks({});
      const ebooksOnly = (res.data.books as Ebook[]).filter((b) => b.isEbook);
      setEbooks(ebooksOnly);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchEbooks(); }, []);

  const handleSearchChange = (text: string) => {
    setSearch(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setActiveCategory('All'), 300);
  };

  const categories = ['All', ...Array.from(new Set(ebooks.map((b) => b.category))).sort()];

  const filtered = ebooks.filter((b) => {
    const matchesSearch =
      !search.trim() ||
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.author.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'All' || b.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleOpen = (item: Ebook) => {
    router.push(`/books/reader?id=${item._id}&title=${encodeURIComponent(item.title)}` as any);
  };

  const renderItem = ({ item }: { item: Ebook }) => (
    <TouchableOpacity
      style={styles.item}
      onPress={() => handleOpen(item)}
      activeOpacity={0.75}
    >
      <EbookCover
        coverImageUrl={item.coverImageUrl}
        isbn={item.isbn}
        title={item.title}
      />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.author} numberOfLines={1}>{item.author}</Text>
        <View style={styles.row}>
          <Text style={styles.category}>{item.category}</Text>
          <Text style={styles.readLabel}>Read Online</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search */}
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
      {!loading && categories.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScrollView}
          contentContainerStyle={styles.chips}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, activeCategory === cat && styles.chipActive]}
              onPress={() => setActiveCategory(cat)}
            >
              <Text style={[styles.chipText, activeCategory === cat && styles.chipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* List */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={Colors.accent} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(b) => b._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          onRefresh={() => { setRefreshing(true); fetchEbooks(); }}
          refreshing={refreshing}
          ListEmptyComponent={
            <View style={styles.emptyFull}>
              <Text style={styles.emptyTitle}>No eBooks found</Text>
              <Text style={styles.emptyBody}>Try a different title, author, or category.</Text>
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  category: {
    fontSize: 11,
    fontFamily: Fonts.bodyMedium,
    color: Colors.textMuted,
    backgroundColor: Colors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.inner,
  },
  readLabel: {
    fontSize: 11,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.accent,
  },

  emptyFull: { flex: 1, justifyContent: 'center', paddingHorizontal: 32, paddingTop: 60 },
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
