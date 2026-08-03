import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import StarRow, { SCORE_LABELS } from '@/components/StarRow';
import { deleteBookReview, getBook, getBookReviews, submitBookReview } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Colors, { Radius } from '@/constants/colors';
import { Fonts } from '@/constants/typography';

interface Book {
  _id: string;
  title: string;
  author: string;
}

interface BookReview {
  _id: string;
  userId?: string;
  score: number;
  comment?: string;
}

export default function BookReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [book, setBook] = useState<Book | null>(null);
  const [existingReview, setExistingReview] = useState<BookReview | null>(null);
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
      return;
    }

    if (!authLoading && user && id) {
      loadReviewData();
    }
  }, [authLoading, user, id]);

  const loadReviewData = async () => {
    setLoading(true);
    try {
      const [bookRes, reviewsRes] = await Promise.all([getBook(id), getBookReviews(id)]);
      const fetchedBook = bookRes.data.book;
      const reviews: BookReview[] = reviewsRes?.data?.reviews ?? [];
      const mine = reviews.find(
        (r) => r.userId === user?.id || r.userId === (user as any)?.patronId
      ) ?? null;

      setBook(fetchedBook);
      setExistingReview(mine);
      if (mine) {
        setScore(mine.score);
        setComment(mine.comment ?? '');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Could not load review form.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = useMemo(() => score > 0 && !submitting && !deleting, [score, submitting, deleting]);

  const handleDelete = () => {
    if (!existingReview) {
      return;
    }

    Alert.alert('Delete Review', 'Are you sure you want to delete your review?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteBookReview(id, existingReview._id);
            router.replace(`/books/${id}?reviewUpdated=${Date.now()}` as any);
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.error || 'Failed to delete review.');
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  const handleSubmit = async () => {
    if (score === 0) {
      Alert.alert('Incomplete', 'Please select a star rating.');
      return;
    }

    setSubmitting(true);
    try {
      await submitBookReview(id, score, comment.trim() || undefined);
      Alert.alert('Success', existingReview ? 'Your review has been updated.' : 'Your review has been submitted.');
      router.replace(`/books/${id}?reviewUpdated=${Date.now()}` as any);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  if (!book) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.emptyText}>Book not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{existingReview ? 'Update Review' : 'Write a Review'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.bookCard}>
          <Text style={styles.bookTitle}>{book.title}</Text>
          <Text style={styles.bookAuthor}>{book.author}</Text>
        </View>

        <Text style={styles.sectionLabel}>Your rating</Text>
        <StarRow value={score} onChange={setScore} />
        {score > 0 && <Text style={styles.scoreLabel}>{SCORE_LABELS[score]}</Text>}

        <Text style={styles.sectionLabel}>
          Comment <Text style={styles.optional}>(optional)</Text>
        </Text>
        <TextInput
          style={styles.commentInput}
          value={comment}
          onChangeText={setComment}
          placeholder="Share your thoughts about this book..."
          placeholderTextColor={Colors.textMuted}
          multiline
          numberOfLines={5}
          maxLength={500}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>{comment.length}/500</Text>

        <TouchableOpacity
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>{existingReview ? 'Update Review' : 'Submit Review'}</Text>
          )}
        </TouchableOpacity>

        {existingReview && (
          <TouchableOpacity
            style={[styles.deleteBtn, deleting && styles.deleteBtnDisabled]}
            onPress={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator color={Colors.error} />
            ) : (
              <Text style={styles.deleteText}>Delete Review</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const cardShadow = {
  elevation: 2 as const,
  shadowColor: Colors.shadow,
  shadowOpacity: 0.05,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 2 },
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { justifyContent: 'center', alignItems: 'center' },
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
  backBtn: { padding: 4, marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 17, fontFamily: Fonts.heading, color: Colors.textPrimary },
  content: { padding: 20, paddingBottom: 40 },
  bookCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.container,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    ...cardShadow,
  },
  bookTitle: { fontSize: 16, fontFamily: Fonts.bodySemiBold, color: Colors.textPrimary, marginBottom: 4 },
  bookAuthor: { fontSize: 14, fontFamily: Fonts.body, color: Colors.textSecond },
  sectionLabel: {
    fontSize: 13, fontFamily: Fonts.heading, color: Colors.textPrimary, marginBottom: 8,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  scoreLabel: { fontSize: 14, fontFamily: Fonts.bodySemiBold, color: Colors.accent, marginBottom: 12 },
  optional: { fontFamily: Fonts.body, color: Colors.textMuted },
  commentInput: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.container,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.textPrimary,
    minHeight: 120,
    marginBottom: 4,
  },
  charCount: { fontSize: 12, fontFamily: Fonts.body, color: Colors.textMuted, textAlign: 'right', marginBottom: 24 },
  submitBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.container,
    padding: 16,
    alignItems: 'center',
    elevation: 4,
    shadowColor: Colors.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitText: { color: '#fff', fontSize: 16, fontFamily: Fonts.bodySemiBold },
  deleteBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.error,
    backgroundColor: 'transparent',
    borderRadius: Radius.container,
    padding: 16,
    alignItems: 'center',
  },
  deleteBtnDisabled: { opacity: 0.45 },
  deleteText: { color: Colors.error, fontSize: 16, fontFamily: Fonts.bodySemiBold },
  emptyText: { fontFamily: Fonts.body, color: Colors.textMuted, fontSize: 14 },
});
