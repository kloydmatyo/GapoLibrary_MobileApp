import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { getHistory, getBooks, getPreferences } from '@/lib/api';
import Colors, { Radius } from '@/constants/colors';
import { Fonts } from '@/constants/typography';
import ChatModal from '@/components/ChatModal';
import BookCover from '@/components/BookCover';
import { normalizeLoanStatus, statusBorderColor } from '@/lib/loanStatus';

interface LoanItem {
  _id: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  dueDate: string;
  status: 'active' | 'pending_pickup' | 'overdue';
  isbn?: string;
  coverImageUrl?: string;
}

interface BookItem {
  _id: string;
  title: string;
  author: string;
  category: string;
  availableCopies: number;
  isEbook: boolean;
  isbn?: string;
  coverImageUrl?: string;
}

const QUICK_ACTIONS = [
  { label: 'Catalog', icon: 'book-outline', route: '/(tabs)/books' as const },
  { label: 'eBooks', icon: 'reader-outline', route: '/(tabs)/ebooks' as const },
  { label: 'Events', icon: 'calendar-outline', route: '/events' as const },
  { label: 'Rate Librarian', icon: 'star-outline', route: '/rate' as const },
] as const;

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function buildActionSubtitle(
  activeLoans: LoanItem[],
  stats: { active: number; overdue: number },
): string {
  if (stats.overdue > 0) {
    return `You have ${stats.overdue} overdue book${stats.overdue > 1 ? 's' : ''} — return ${stats.overdue > 1 ? 'them' : 'it'} to avoid penalties`;
  }

  const dueSoon = activeLoans
    .filter((l) => l.status !== 'pending_pickup')
    .map((l) => ({ loan: l, days: daysUntil(l.dueDate) }))
    .filter(({ days }) => days >= 0 && days <= 3)
    .sort((a, b) => a.days - b.days)[0];

  if (dueSoon) {
    const { days } = dueSoon;
    if (days === 0) return 'You have a book due today';
    if (days === 1) return 'You have 1 book due tomorrow';
    return `You have 1 book due in ${days} days`;
  }

  const pending = activeLoans.filter((l) => l.status === 'pending_pickup').length;
  if (pending > 0) {
    return `You have ${pending} book${pending > 1 ? 's' : ''} ready for pickup`;
  }

  if (stats.active > 0) {
    return `You have ${stats.active} book${stats.active > 1 ? 's' : ''} on loan`;
  }

  return 'Browse the catalog to find your next read';
}

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [activeLoans, setActiveLoans] = useState<LoanItem[]>([]);
  const [recommended, setRecommended] = useState<BookItem[]>([]);
  const [stats, setStats] = useState({ active: 0, overdue: 0, returned: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const actionSubtitle = useMemo(
    () => buildActionSubtitle(activeLoans, stats),
    [activeLoans, stats],
  );

  const load = useCallback(async () => {
    try {
      const [historyRes, prefsRes, booksRes] = await Promise.all([
        getHistory(),
        getPreferences(),
        getBooks({}),
      ]);

      const history = historyRes.data.history ?? [];
      const allBooks: BookItem[] = booksRes.data.books ?? [];
      const bookMeta = new Map(
        allBooks.map((b) => [b._id, { isbn: b.isbn, coverImageUrl: b.coverImageUrl }]),
      );

      const favoriteCategories: string[] = prefsRes.data.preferences?.favoriteCategories ?? [];

      const active = history.filter((h: any) =>
        h.status === 'active' || h.status === 'pending_pickup' || h.status === 'overdue',
      );
      const returned = history.filter((h: any) => h.status === 'returned').length;
      const overdue = active.filter((h: any) =>
        h.status === 'overdue' || (h.status === 'active' && new Date(h.dueDate) < new Date()),
      ).length;

      const enrichedLoans: LoanItem[] = active.slice(0, 5).map((h: any) => {
        const meta = bookMeta.get(h.bookId);
        return {
          _id: h._id,
          bookId: h.bookId,
          bookTitle: h.bookTitle,
          bookAuthor: h.bookAuthor,
          dueDate: h.dueDate,
          status: h.status,
          isbn: meta?.isbn,
          coverImageUrl: meta?.coverImageUrl,
        };
      });

      setActiveLoans(enrichedLoans);
      setStats({ active: active.length, overdue, returned });

      const filtered =
        favoriteCategories.length > 0
          ? allBooks.filter((b) => b.category === favoriteCategories[0])
          : allBooks;
      setRecommended(filtered.slice(0, 8));
    } catch (e) {
      console.error('Dashboard load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.accent]} />
        }
      >
        {/* Greeting */}
        <View style={styles.hero}>
          <View style={styles.heroText}>
            <Text style={styles.greeting}>
              Hello, {user?.name?.split(' ')[0]}
            </Text>
            <Text style={styles.actionSubtitle}>{actionSubtitle}</Text>
          </View>
          <TouchableOpacity style={styles.chatBtn} onPress={() => setChatOpen(true)}>
            <Ionicons name="chatbubble-ellipses-outline" size={22} color={Colors.accent} />
          </TouchableOpacity>
        </View>

        {/* Overdue alert strip */}
        {stats.overdue > 0 && (
          <TouchableOpacity
            style={styles.overdueStrip}
            onPress={() => router.push('/(tabs)/history' as any)}
            activeOpacity={0.85}
          >
            <Ionicons name="alert-circle" size={20} color={Colors.error} />
            <Text style={styles.overdueStripText}>
              {stats.overdue} overdue — tap to view and return
            </Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.error} />
          </TouchableOpacity>
        )}

        {/* Compact stats row (borrowed + returned only) */}
        {(stats.active > 0 || stats.returned > 0) && (
          <View style={styles.compactStats}>
            <CompactStat label="On loan" value={stats.active} />
            <View style={styles.statDivider} />
            <CompactStat label="Returned" value={stats.returned} />
          </View>
        )}

        {/* Active loans */}
        {activeLoans.length > 0 && (
          <Section title="Active Loans" onSeeAll={() => router.push('/(tabs)/history' as any)}>
            {activeLoans.map((loan) => {
              const days = daysUntil(loan.dueDate);
              const displayStatus = normalizeLoanStatus(loan.status, loan.dueDate);
              const isOverdue = displayStatus === 'overdue';
              const isPending = displayStatus === 'pending_pickup';
              const borderColor = statusBorderColor(displayStatus);

              return (
                <View
                  key={loan._id}
                  style={[styles.loanCard, { borderLeftColor: borderColor }]}
                >
                  <BookCover
                    isbn={loan.isbn}
                    coverImageUrl={loan.coverImageUrl}
                    width={44}
                    height={60}
                  />
                  <View style={styles.loanInfo}>
                    <Text style={styles.loanTitle} numberOfLines={1}>{loan.bookTitle}</Text>
                    <Text style={styles.loanAuthor}>{loan.bookAuthor}</Text>
                    {isPending ? (
                      <Text style={styles.loanMeta}>Awaiting pickup</Text>
                    ) : (
                      <Text style={[styles.loanMeta, isOverdue && styles.loanMetaOverdue]}>
                        {isOverdue
                          ? `${Math.abs(days)}d overdue`
                          : days === 0
                            ? 'Due today'
                            : `Due ${fmt(loan.dueDate)} · ${days}d left`}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </Section>
        )}

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          {QUICK_ACTIONS.map((a) => (
            <TouchableOpacity
              key={a.label}
              style={styles.quickCard}
              onPress={() => router.push(a.route as any)}
            >
              <Ionicons name={a.icon as any} size={24} color={Colors.accent} />
              <Text style={styles.quickLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recommended books */}
        {recommended.length > 0 && (
          <Section title="Recommended for You" onSeeAll={() => router.push('/(tabs)/books' as any)}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bookScroll}>
              {recommended.map((book) => (
                <TouchableOpacity
                  key={book._id}
                  style={styles.bookCard}
                  onPress={() => router.push(`/books/${book._id}` as any)}
                >
                  <BookCover
                    isbn={book.isbn}
                    coverImageUrl={book.coverImageUrl}
                    width={160}
                    height={112}
                    style={styles.bookCoverWrap}
                    imageStyle={styles.bookCoverImg}
                  />
                  {book.isEbook && (
                    <View style={styles.ebookBadge}>
                      <Text style={styles.ebookBadgeText}>eBook</Text>
                    </View>
                  )}
                  <Text style={styles.bookTitle} numberOfLines={2}>{book.title}</Text>
                  <Text style={styles.bookAuthor} numberOfLines={1}>{book.author}</Text>
                  <Text style={styles.availText}>
                    {book.isEbook
                      ? 'Always available'
                      : book.availableCopies > 0
                        ? `${book.availableCopies} available`
                        : 'Unavailable'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Section>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setChatOpen(true)}>
        <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
      </TouchableOpacity>

      <ChatModal visible={chatOpen} onClose={() => setChatOpen(false)} />
    </View>
  );
}

function CompactStat({ label, value }: { label: string; value: number }) {
  return (
    <View style={compactStatStyles.item}>
      <Text style={compactStatStyles.value}>{value}</Text>
      <Text style={compactStatStyles.label}>{label}</Text>
    </View>
  );
}

function Section({ title, onSeeAll, children }: { title: string; onSeeAll?: () => void; children: React.ReactNode }) {
  return (
    <View style={sectionStyles.wrap}>
      <View style={sectionStyles.header}>
        <Text style={sectionStyles.title}>{title}</Text>
        {onSeeAll && (
          <TouchableOpacity onPress={onSeeAll}>
            <Text style={sectionStyles.seeAll}>See all</Text>
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}

const compactStatStyles = StyleSheet.create({
  item: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  value: {
    fontSize: 20,
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
  },
  label: {
    fontSize: 11,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textSecond,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});

const sectionStyles = StyleSheet.create({
  wrap: { marginBottom: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: {
    fontSize: 13,
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  seeAll: { fontSize: 13, fontFamily: Fonts.bodySemiBold, color: Colors.accent },
});

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: Colors.background },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: 16 },

  hero: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 4,
  },
  heroText: { flex: 1, paddingRight: 12 },
  greeting: {
    fontSize: 26,
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  actionSubtitle: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.textSecond,
    marginTop: 6,
    lineHeight: 20,
  },
  chatBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.container,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },

  overdueStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.errorBg,
    borderRadius: Radius.container,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
  },
  overdueStripText: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.error,
  },

  compactStats: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.container,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
    overflow: 'hidden',
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: 8,
  },

  loanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: Radius.container,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
  },
  loanInfo: { flex: 1 },
  loanTitle: {
    fontSize: 14,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textPrimary,
  },
  loanAuthor: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: Colors.textSecond,
    marginTop: 2,
  },
  loanMeta: {
    fontSize: 12,
    fontFamily: Fonts.bodyMedium,
    color: Colors.textMuted,
    marginTop: 4,
  },
  loanMetaOverdue: { color: Colors.error },

  sectionTitle: {
    fontSize: 13,
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  quickCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.container,
    padding: 14,
    alignItems: 'center',
    flex: 1,
    minWidth: '45%',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickLabel: {
    marginTop: 6,
    fontSize: 11,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },

  bookScroll: { gap: 12, paddingRight: 4 },
  bookCard: {
    width: 160,
    backgroundColor: Colors.surface,
    borderRadius: Radius.container,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bookCoverWrap: { width: '100%' },
  bookCoverImg: { width: 160, height: 112, borderRadius: 0 },
  ebookBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: Colors.accent,
    borderRadius: Radius.inner,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  ebookBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontFamily: Fonts.bodyBold,
  },
  bookTitle: {
    fontSize: 13,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textPrimary,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 2,
  },
  bookAuthor: {
    fontSize: 11,
    fontFamily: Fonts.body,
    color: Colors.textSecond,
    paddingHorizontal: 10,
    paddingBottom: 4,
  },
  availText: {
    fontSize: 10,
    fontFamily: Fonts.bodyMedium,
    color: Colors.textMuted,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },

  fab: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    width: 52,
    height: 52,
    borderRadius: Radius.container,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: Colors.shadow,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});
