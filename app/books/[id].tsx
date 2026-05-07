import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image,
  ActivityIndicator, Alert, TouchableOpacity, Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getBook, getHistory, toggleBookmark, getBookmarks, getReservations } from '@/lib/api';
import { useBookAvailability } from '@/context/BookAvailabilityContext';
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
  const router = useRouter();
  const { availability, updateBookAvailability } = useBookAvailability();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [alreadyBorrowed, setAlreadyBorrowed] = useState(false);
  const [alreadyQueued, setAlreadyQueued] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  useEffect(() => {
    const loadBook = async () => {
      try {
        const [bookRes, historyRes, bookmarkIds, reservationsRes] = await Promise.all([
          getBook(id),
          getHistory(),
          getBookmarks(),
          getReservations(),
        ]);
        setBook(bookRes.data.book);
        await updateBookAvailability(id);

        const active = (historyRes.data.history ?? []).filter(
          (h: any) => h.status === 'pending_pickup' || h.status === 'active'
        );
        setAlreadyBorrowed(active.some((h: any) => h.bookId === id));
        setBookmarked(bookmarkIds.includes(id));

        // Check if already in queue for this book
        const queued = (reservationsRes.data.reservations ?? []).some(
          (r: any) => r.bookId === id && r.status === 'pending'
        );
        setAlreadyQueued(queued);
      } catch {
        Alert.alert('Error', 'Could not load book details.');
      } finally {
        setLoading(false);
      }
    };

    loadBook();

    const interval = setInterval(() => {
      updateBookAvailability(id);
    }, 15000);

    return () => clearInterval(interval);
  }, [id, updateBookAvailability]);


  const handleBookmark = async () => {
    setBookmarkLoading(true);
    try {
      const res = await toggleBookmark(id);
      setBookmarked(res.data.bookmarked);
    } catch {
      Alert.alert('Error', 'Could not update bookmark.');
    } finally {
      setBookmarkLoading(false);
    }
  };

  if (loading) return (    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={Colors.brand} />
    </View>
  );

  if (!book) return <Text style={styles.empty}>Book not found.</Text>;

  const realtimeAvailability = availability[id];
  const availableCopies = realtimeAvailability?.availableCopies ?? book.availableCopies;
  const totalCopies = realtimeAvailability?.totalCopies ?? book.totalCopies;
  const available = availableCopies > 0;
  const hasRealtimeData = !!realtimeAvailability;

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{book.title}</Text>
        <TouchableOpacity
          style={styles.bookmarkButton}
          onPress={handleBookmark}
          disabled={bookmarkLoading}
        >
          <Ionicons
            name={bookmarked ? 'bookmark' : 'bookmark-outline'}
            size={24}
            color={bookmarked ? Colors.brand : Colors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.coverWrap}>
          {book.coverImageUrl
            ? <Image source={{ uri: book.coverImageUrl }} style={styles.cover} resizeMode="cover" />
            : (
              <LinearGradient colors={['#2e7d32', '#15803d']} style={styles.coverPlaceholder}>
                <Ionicons name="book" size={64} color="rgba(255,255,255,0.7)" />
              </LinearGradient>
            )}
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
          {hasRealtimeData && (
            <View style={styles.liveStatus}>
              <View style={styles.liveDotLarge} />
              <Text style={styles.liveText}>Live availability</Text>
            </View>
          )}
          {([
            book.isEbook ? null : ['Available Copies', `${availableCopies} / ${totalCopies}`],
            book.isbn ? ['ISBN', book.isbn] : null,
            book.publisher ? ['Publisher', book.publisher] : null,
            book.publicationYear ? ['Year', String(book.publicationYear)] : null,
          ].filter(Boolean) as [string, string][]).map(([label, value]) => (
            <View key={label as string} style={styles.row}>
              <Text style={styles.label}>{label}</Text>
              <Text style={[styles.value, label === 'Available Copies' && {
                color: available ? Colors.success : Colors.error, fontWeight: '700',
              }]}>
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

        {book.isEbook && book.ebookUrl ? (
          <TouchableOpacity
            style={styles.readOnlineBtn}
            onPress={() => {
              Linking.openURL(book.ebookUrl!).catch(() => {
                Alert.alert('Error', 'Could not open the eBook link.');
              });
            }}
          >
            <Ionicons name="reader-outline" size={20} color="#fff" />
            <Text style={styles.readOnlineText}>Read Online</Text>
          </TouchableOpacity>
        ) : alreadyBorrowed ? (
          <View style={[styles.actionBtn, styles.disabledBtn]}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
            <Text style={styles.actionBtnText}>Already Borrowed</Text>
          </View>
        ) : available ? (
          <>
            <View style={styles.borrowHint}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.brand} />
              <Text style={styles.borrowHintText}>
                You must visit the library to collect your book within 24 hours of requesting.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push(`/books/borrow?id=${id}` as any)}
            >
              <Ionicons name="book-outline" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>Borrow This Book</Text>
            </TouchableOpacity>
          </>
        ) : alreadyQueued ? (
          <View style={[styles.joinQueueBtn, styles.disabledBtn]}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
            <Text style={styles.actionBtnText}>Already in Queue</Text>
          </View>
        ) : (
          <>
            <View style={styles.queueHint}>
              <Ionicons name="time-outline" size={16} color="#f59e0b" />
              <Text style={styles.queueHintText}>
                All copies are checked out. Join the queue and we'll notify you when one is available.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.joinQueueBtn}
              onPress={() => router.push(`/books/reserve?id=${id}` as any)}
            >
              <Ionicons name="time-outline" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>Join Queue</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  backButton: { padding: 4, marginRight: 12 },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  bookmarkButton: { padding: 4 },
  scroll: { flex: 1 },
  content: { padding: 20 },
  coverWrap: {
    width: 130, height: 175, borderRadius: 16, backgroundColor: Colors.brandLight,
    justifyContent: 'center', alignItems: 'center', alignSelf: 'center',
    marginBottom: 16, overflow: 'hidden',
    elevation: 8, shadowColor: '#2e7d32', shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 8 },
  },
  cover: { width: '100%', height: '100%' },
  coverPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '900', color: Colors.textPrimary, textAlign: 'center', marginBottom: 4 },
  author: { fontSize: 14, color: Colors.textSecond, textAlign: 'center', marginBottom: 12, fontWeight: '600' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 16 },
  badge: { backgroundColor: Colors.brandMuted, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  badgeText: { fontSize: 12, color: Colors.brandDarker, fontWeight: '800' },
  card: {
    backgroundColor: Colors.surface, borderRadius: 20, padding: 16, marginBottom: 12,
    elevation: 4, shadowColor: Colors.shadow, shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  liveStatus: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingBottom: 12, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  liveDotLarge: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.brand },
  liveText: { fontSize: 12, fontWeight: '700', color: Colors.brand },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  label: { fontSize: 13, color: Colors.textSecond, fontWeight: '600' },
  value: { fontSize: 13, color: Colors.textPrimary, fontWeight: '700' },
  descCard: { backgroundColor: Colors.surface, borderRadius: 20, padding: 16, marginBottom: 16,
    elevation: 4, shadowColor: Colors.shadow, shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  descTitle: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  desc: { fontSize: 13, color: '#4b5563', lineHeight: 20 },
  readOnlineBtn: {
    backgroundColor: Colors.brandDarker, borderRadius: 14, padding: 16, alignItems: 'center',
    marginBottom: 20, flexDirection: 'row', justifyContent: 'center', gap: 8,
    elevation: 5, shadowColor: '#2e7d32', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 5 },
  },
  readOnlineText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  borrowHint: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: Colors.brandMuted, borderRadius: 14, padding: 12, marginBottom: 12,
  },
  borrowHintText: { flex: 1, fontSize: 13, color: Colors.brandDark, lineHeight: 18, fontWeight: '600' },
  queueHint: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#fef3c7', borderRadius: 14, padding: 12, marginBottom: 12,
  },
  queueHintText: { flex: 1, fontSize: 13, color: '#92400e', lineHeight: 18, fontWeight: '600' },
  actionBtn: {
    backgroundColor: Colors.brandDarker, borderRadius: 14, padding: 16,
    alignItems: 'center', marginBottom: 20, flexDirection: 'row', justifyContent: 'center', gap: 8,
    elevation: 5, shadowColor: '#2e7d32', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 5 },
  },
  joinQueueBtn: {
    backgroundColor: '#f59e0b', borderRadius: 14, padding: 16,
    alignItems: 'center', marginBottom: 20, flexDirection: 'row', justifyContent: 'center', gap: 8,
    elevation: 5, shadowColor: '#f59e0b', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 5 },
  },
  actionBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  disabledBtn: { backgroundColor: Colors.textMuted, elevation: 0, shadowOpacity: 0 },
  empty: { textAlign: 'center', marginTop: 60, color: Colors.textMuted },
});
