import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image,
  ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getBook, getHistory, toggleBookmark, getBookmarks, getReservations, getBookReviews } from '@/lib/api';
import { useBookAvailability } from '@/context/BookAvailabilityContext';
import Colors, { Radius } from '@/constants/colors';
import { Fonts } from '@/constants/typography';

const cardShadow = {
  elevation: 2 as const,
  shadowColor: Colors.shadow,
  shadowOpacity: 0.05,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 2 },
};

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

interface BookReview {
  _id: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
  score: number;
  comment?: string;
  createdAt: string;
}

export default function BookDetailScreen() {
  const { id, reviewUpdated } = useLocalSearchParams<{ id: string; reviewUpdated?: string }>();
  const router = useRouter();
  const { availability, updateBookAvailability } = useBookAvailability();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [alreadyBorrowed, setAlreadyBorrowed] = useState(false);
  const [alreadyQueued, setAlreadyQueued] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [reviews, setReviews] = useState<BookReview[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [ratingDist, setRatingDist] = useState<number[]>([0, 0, 0, 0, 0]);

  useEffect(() => {
    const loadBook = async () => {
      try {
        const [bookRes, historyRes, bookmarkIds, reservationsRes, reviewsRes] = await Promise.all([
          getBook(id),
          getHistory(),
          getBookmarks(),
          getReservations(),
          getBookReviews(id),
        ]);
        setBook(bookRes.data.book);
        await updateBookAvailability(id);

        const reviewPayload = reviewsRes?.data ?? {};
        setReviews(reviewPayload.reviews ?? []);
        setAvgRating(Number(reviewPayload.avg ?? 0));
        setTotalReviews(Number(reviewPayload.total ?? 0));
        setRatingDist(Array.isArray(reviewPayload.dist) ? reviewPayload.dist : [0, 0, 0, 0, 0]);

        const history = historyRes.data.history ?? [];

        const activelyBorrowed = history.some(
          (h: any) =>
            h.bookId === id &&
            ['active', 'pending_pickup'].includes(h.status)
        );

        const hasEverBorrowed = history.some(
          (h: any) =>
            h.bookId === id &&
            ['active', 'pending_pickup', 'returned', 'overdue'].includes(h.status)
        );

        setAlreadyBorrowed(activelyBorrowed);
        setCanReview(hasEverBorrowed);
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
  }, [id, reviewUpdated, updateBookAvailability]);


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
      <ActivityIndicator size="large" color={Colors.accent} />
    </View>
  );

  if (!book) return <Text style={styles.empty}>Book not found.</Text>;

  const realtimeAvailability = availability[id];
  const availableCopies = realtimeAvailability?.availableCopies ?? book.availableCopies;
  const totalCopies = realtimeAvailability?.totalCopies ?? book.totalCopies;
  const available = availableCopies > 0;
  const hasRealtimeData = !!realtimeAvailability;
  const canWriteReview = canReview || book.isEbook;

  const formatReviewerName = (review: BookReview) => {
    const firstName = (review.firstName ?? '').trim();
    const lastName = (review.lastName ?? '').trim();
    if (!firstName && !lastName) return 'Anonymous Patron';
    const lastInitial = lastName ? `${lastName.charAt(0).toUpperCase()}.` : '';
    return `${firstName}${lastInitial ? ` ${lastInitial}` : ''}`;
  };

  const formatPostedDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return 'Unknown date';
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

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
            color={bookmarked ? Colors.accent : Colors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.coverWrap}>
          {book.coverImageUrl
            ? <Image source={{ uri: book.coverImageUrl }} style={styles.cover} resizeMode="cover" />
            : (
              <LinearGradient colors={[Colors.accent, Colors.accentDark]} style={styles.coverPlaceholder}>
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
                color: available ? Colors.accent : Colors.textMuted,
              }, label === 'Available Copies' && styles.valueAvail]}>
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

        <View style={styles.reviewsCard}>
          <Text style={styles.reviewsTitle}>Reviews & Ratings</Text>

          {totalReviews > 0 ? (
            <>
              <View style={styles.ratingSummaryRow}>
                <View style={styles.avgWrap}>
                  <Ionicons name="star" size={24} color="#f59e0b" />
                  <Text style={styles.avgText}>{avgRating.toFixed(1)}</Text>
                </View>
                <Text style={styles.totalReviewsText}>
                  {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
                </Text>
              </View>

              <View style={styles.distWrap}>
                {[5, 4, 3, 2, 1].map((star, index) => {
                  const count = ratingDist[index] ?? 0;
                  const progress = totalReviews > 0 ? count / totalReviews : 0;
                  return (
                    <View key={star} style={styles.distRow}>
                      <Text style={styles.distLabel}>{star}★</Text>
                      <View style={styles.distBarTrack}>
                        <View style={[styles.distBarFill, { width: `${progress * 100}%` }]} />
                      </View>
                      <Text style={styles.distCount}>{count}</Text>
                    </View>
                  );
                })}
              </View>

              <View style={styles.reviewList}>
                {reviews.map((review) => (
                  <View key={review._id} style={styles.reviewItemCard}>
                    <View style={styles.reviewHeader}>
                      <Text style={styles.reviewerName}>{formatReviewerName(review)}</Text>
                      <View style={styles.reviewStars}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Ionicons
                            key={`${review._id}-${star}`}
                            name={star <= review.score ? 'star' : 'star-outline'}
                            size={16}
                            color={star <= review.score ? '#f59e0b' : Colors.border}
                          />
                        ))}
                      </View>
                    </View>

                    {review.comment ? (
                      <Text style={styles.reviewComment}>{review.comment}</Text>
                    ) : null}

                    <Text style={styles.reviewDate}>{formatPostedDate(review.createdAt)}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <Text style={styles.emptyReviewsText}>
              No reviews yet. Be the first to review this book.
            </Text>
          )}

          {canWriteReview && (
            <TouchableOpacity
              style={styles.writeReviewBtn}
              onPress={() => router.push(`/books/review?id=${id}` as any)}
            >
              <Ionicons name="create-outline" size={18} color="#fff" />
              <Text style={styles.writeReviewText}>Write a Review</Text>
            </TouchableOpacity>
          )}
        </View>

        {book.isEbook && book.ebookUrl ? (
          <TouchableOpacity
            style={styles.readOnlineBtn}
            onPress={() => {
              router.push(`/books/reader?id=${id}&title=${encodeURIComponent(book.title)}&url=${encodeURIComponent(book.ebookUrl!)}` as any);
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
              <Ionicons name="information-circle-outline" size={16} color={Colors.accent} />
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
              <Ionicons name="time-outline" size={16} color={Colors.accent} />
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
    ...cardShadow,
  },
  backButton: { padding: 4, marginRight: 12 },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
  },
  bookmarkButton: { padding: 4 },
  scroll: { flex: 1 },
  content: { padding: 20 },
  coverWrap: {
    width: 130, height: 175, borderRadius: Radius.container, backgroundColor: Colors.accentMuted,
    justifyContent: 'center', alignItems: 'center', alignSelf: 'center',
    marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border, ...cardShadow,
  },
  cover: { width: '100%', height: '100%' },
  coverPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  title: {
    fontSize: 22, fontFamily: Fonts.heading, color: Colors.textPrimary,
    textAlign: 'center', marginBottom: 4,
  },
  author: {
    fontSize: 14, fontFamily: Fonts.body, color: Colors.textSecond,
    textAlign: 'center', marginBottom: 12,
  },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 16 },
  badge: {
    backgroundColor: Colors.accentMuted, paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: Radius.inner,
  },
  badgeText: { fontSize: 12, fontFamily: Fonts.bodyBold, color: Colors.accentDark },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.container, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.border, ...cardShadow,
  },
  liveStatus: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingBottom: 12, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  liveDotLarge: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent },
  liveText: { fontSize: 12, fontFamily: Fonts.bodySemiBold, color: Colors.accent },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  label: { fontSize: 13, fontFamily: Fonts.bodyMedium, color: Colors.textSecond },
  value: { fontSize: 13, fontFamily: Fonts.bodySemiBold, color: Colors.textPrimary },
  valueAvail: { fontFamily: Fonts.bodySemiBold },
  descCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.container, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: Colors.border, ...cardShadow,
  },
  descTitle: {
    fontSize: 13, fontFamily: Fonts.heading, color: Colors.textPrimary, marginBottom: 8,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  desc: { fontSize: 13, fontFamily: Fonts.body, color: Colors.textSecond, lineHeight: 20 },
  reviewsCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.container,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...cardShadow,
  },
  reviewsTitle: {
    fontSize: 13, fontFamily: Fonts.heading, color: Colors.textPrimary, marginBottom: 10,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  ratingSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  avgWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  avgText: { fontSize: 30, fontFamily: Fonts.heading, color: Colors.textPrimary, lineHeight: 36 },
  totalReviewsText: { fontSize: 13, fontFamily: Fonts.bodyMedium, color: Colors.textSecond },
  distWrap: { marginBottom: 14, gap: 8 },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  distLabel: { width: 24, fontSize: 12, fontFamily: Fonts.bodySemiBold, color: Colors.textSecond },
  distBarTrack: { flex: 1, height: 6, borderRadius: Radius.inner, backgroundColor: Colors.border, overflow: 'hidden' },
  distBarFill: { height: '100%', backgroundColor: Colors.accent, borderRadius: Radius.inner },
  distCount: { width: 20, textAlign: 'right', fontSize: 12, fontFamily: Fonts.bodySemiBold, color: Colors.textSecond },
  reviewList: { gap: 10, marginBottom: 10 },
  reviewItemCard: {
    backgroundColor: Colors.background, borderRadius: Radius.container, padding: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  reviewerName: { fontSize: 13, fontFamily: Fonts.bodySemiBold, color: Colors.textPrimary },
  reviewStars: { flexDirection: 'row', gap: 2 },
  reviewComment: { fontSize: 13, fontFamily: Fonts.body, color: Colors.textSecond, lineHeight: 18, marginBottom: 8 },
  reviewDate: { fontSize: 11, fontFamily: Fonts.bodyMedium, color: Colors.textMuted },
  emptyReviewsText: { fontSize: 13, fontFamily: Fonts.body, color: Colors.textSecond, lineHeight: 19, marginBottom: 10 },
  writeReviewBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.container,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    elevation: 4,
    shadowColor: Colors.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  writeReviewText: { color: '#fff', fontFamily: Fonts.bodySemiBold, fontSize: 14 },
  readOnlineBtn: {
    backgroundColor: Colors.accentDark, borderRadius: Radius.container, padding: 16, alignItems: 'center',
    marginBottom: 20, flexDirection: 'row', justifyContent: 'center', gap: 8,
    elevation: 4, shadowColor: Colors.shadow, shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
  },
  readOnlineText: { color: '#fff', fontFamily: Fonts.bodySemiBold, fontSize: 16 },
  borrowHint: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: Colors.accentMuted, borderRadius: Radius.container, padding: 12, marginBottom: 12,
  },
  borrowHintText: { flex: 1, fontSize: 13, fontFamily: Fonts.bodyMedium, color: Colors.accentDark, lineHeight: 18 },
  queueHint: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: Colors.surfaceMuted, borderRadius: Radius.container, padding: 12, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  queueHintText: { flex: 1, fontSize: 13, fontFamily: Fonts.bodyMedium, color: Colors.textSecond, lineHeight: 18 },
  actionBtn: {
    backgroundColor: Colors.accentDark, borderRadius: Radius.container, padding: 16,
    alignItems: 'center', marginBottom: 20, flexDirection: 'row', justifyContent: 'center', gap: 8,
    elevation: 4, shadowColor: Colors.shadow, shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
  },
  joinQueueBtn: {
    backgroundColor: Colors.accent, borderRadius: Radius.container, padding: 16,
    alignItems: 'center', marginBottom: 20, flexDirection: 'row', justifyContent: 'center', gap: 8,
    elevation: 4, shadowColor: Colors.shadow, shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
  },
  actionBtnText: { color: '#fff', fontFamily: Fonts.bodySemiBold, fontSize: 16 },
  disabledBtn: { backgroundColor: Colors.textMuted, elevation: 0, shadowOpacity: 0 },
  empty: { textAlign: 'center', marginTop: 60, fontFamily: Fonts.body, color: Colors.textMuted },
});
