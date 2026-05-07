import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { getHistory, getBooks, getPreferences } from '@/lib/api';
import Colors from '@/constants/colors';

interface LoanItem {
  _id: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  dueDate: string;
  status: 'active' | 'pending_pickup' | 'overdue';
}

interface BookItem {
  _id: string;
  title: string;
  author: string;
  category: string;
  availableCopies: number;
  isEbook: boolean;
  coverImageUrl?: string;
}

const QUICK_ACTIONS = [
  { label: 'Catalog',          icon: 'book-outline',    route: '/(tabs)/books' },
  { label: 'eBooks',           icon: 'reader-outline',  route: '/(tabs)/ebooks' },
  { label: 'Events',           icon: 'calendar-outline', route: '/events' },
  { label: 'Rate Librarian',   icon: 'star-outline',    route: '/rate' },
] as const;

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [activeLoans, setActiveLoans] = useState<LoanItem[]>([]);
  const [recommended, setRecommended] = useState<BookItem[]>([]);
  const [stats, setStats] = useState({ active: 0, overdue: 0, returned: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [historyRes, prefsRes] = await Promise.all([
        getHistory(),
        getPreferences(),
      ]);

      const history = historyRes.data.history ?? [];
      const favoriteCategories: string[] = prefsRes.data.preferences?.favoriteCategories ?? [];

      // Treat active-but-past-due as overdue client-side (API returns 'active' for these)
      const active = history.filter((h: any) =>
        h.status === 'active' || h.status === 'pending_pickup' || h.status === 'overdue'
      );
      const returned = history.filter((h: any) => h.status === 'returned').length;
      const overdue = active.filter((h: any) =>
        h.status === 'overdue' || (h.status === 'active' && new Date(h.dueDate) < new Date())
      ).length;

      setActiveLoans(active.slice(0, 5));
      setStats({ active: active.length, overdue, returned });

      // Fetch recommended books based on favorite categories
      const booksRes = await getBooks(
        favoriteCategories.length > 0 ? { category: favoriteCategories[0] } : {}
      );
      setRecommended((booksRes.data.books ?? []).slice(0, 8));
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
        <ActivityIndicator size="large" color={Colors.brand} />
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.brand]} />}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0]} 👋</Text>
            <Text style={styles.subGreeting}>Welcome to GapoLibrary</Text>
          </View>
          <TouchableOpacity style={styles.chatFabInline} onPress={() => router.push('/chat' as any)}>
            <Ionicons name="chatbubble-ellipses" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatCard label="Borrowed" value={stats.active} color={Colors.brand} icon="book-outline" />
          <StatCard
            label="Overdue"
            value={stats.overdue}
            color={stats.overdue > 0 ? Colors.error : Colors.textMuted}
            icon="alert-circle-outline"
            highlight={stats.overdue > 0}
          />
          <StatCard label="Returned" value={stats.returned} color={Colors.success} icon="checkmark-circle-outline" />
        </View>

        {/* Active loans */}
        {activeLoans.length > 0 && (
          <Section title="Active Loans" onSeeAll={() => router.push('/(tabs)/history' as any)}>
            {activeLoans.map((loan) => {
              const days = daysUntil(loan.dueDate);
              const isOverdue = loan.status === 'overdue' || days < 0;
              const isPending = loan.status === 'pending_pickup';
              return (
                <View key={loan._id} style={[styles.loanCard, isOverdue && styles.loanCardOverdue]}>
                  <View style={[styles.loanIcon, { backgroundColor: isOverdue ? Colors.errorBg : isPending ? '#fef3c7' : Colors.brandLight }]}>
                    <Ionicons
                      name={isOverdue ? 'alert-circle' : isPending ? 'time' : 'book'}
                      size={20}
                      color={isOverdue ? Colors.error : isPending ? '#d97706' : Colors.brand}
                    />
                  </View>
                  <View style={styles.loanInfo}>
                    <Text style={styles.loanTitle} numberOfLines={1}>{loan.bookTitle}</Text>
                    <Text style={styles.loanAuthor}>{loan.bookAuthor}</Text>
                    {isPending ? (
                      <Text style={styles.pendingText}>Awaiting pickup</Text>
                    ) : (
                      <Text style={[styles.loanDue, isOverdue && styles.loanDueOverdue]}>
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

        {/* Overdue alert */}
        {stats.overdue > 0 && (
          <TouchableOpacity
            style={styles.overdueAlert}
            onPress={() => router.push('/(tabs)/history' as any)}
          >
            <Ionicons name="warning" size={18} color={Colors.error} />
            <Text style={styles.overdueAlertText}>
              You have {stats.overdue} overdue book{stats.overdue > 1 ? 's' : ''} — tap to view
            </Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.error} />
          </TouchableOpacity>
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
              <Ionicons name={a.icon as any} size={28} color={Colors.brand} />
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
                  <View style={styles.bookCover}>
                    {book.coverImageUrl ? (
                      <Image source={{ uri: book.coverImageUrl }} style={styles.bookCoverImg} />
                    ) : (
                      <Ionicons name="book" size={32} color={Colors.brand} />
                    )}
                    {book.isEbook && (
                      <View style={styles.ebookBadge}>
                        <Text style={styles.ebookBadgeText}>eBook</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.bookTitle} numberOfLines={2}>{book.title}</Text>
                  <Text style={styles.bookAuthor} numberOfLines={1}>{book.author}</Text>
                  <View style={[
                    styles.availBadge,
                    { backgroundColor: book.availableCopies > 0 ? Colors.brandLight : Colors.errorBg },
                  ]}>
                    <Text style={[
                      styles.availText,
                      { color: book.availableCopies > 0 ? Colors.brand : Colors.error },
                    ]}>
                      {book.availableCopies > 0 ? `${book.availableCopies} available` : 'Unavailable'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Section>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Floating chat button */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/chat' as any)}>
        <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

function StatCard({ label, value, color, icon, highlight }: { label: string; value: number; color: string; icon: string; highlight?: boolean }) {
  return (
    <View style={[statStyles.card, highlight && statStyles.cardHighlight]}>
      <Ionicons name={icon as any} size={20} color={color} />
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
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

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 80,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cardHighlight: {
    backgroundColor: Colors.errorBg,
    borderColor: Colors.error,
  },
  value: { fontSize: 20, fontWeight: '800' },
  label: { fontSize: 11, color: Colors.textSecond, fontWeight: '600', textAlign: 'center' },
});

const sectionStyles = StyleSheet.create({
  wrap: { marginBottom: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  seeAll: { fontSize: 13, fontWeight: '600', color: Colors.brand },
});

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: Colors.background },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: 16 },

  // Hero
  hero: {
    backgroundColor: Colors.brand, borderRadius: 16, padding: 20, marginBottom: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  greeting: { fontSize: 20, fontWeight: '700', color: '#fff' },
  subGreeting: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  chatFabInline: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center',
  },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20, alignItems: 'stretch' },

  // Active loans
  loanCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: 12, padding: 12, marginBottom: 8,
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3,
  },
  loanCardOverdue: { borderWidth: 1, borderColor: Colors.error },
  loanIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  loanInfo: { flex: 1 },
  loanTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  loanAuthor: { fontSize: 12, color: Colors.textSecond, marginTop: 1 },
  loanDue: { fontSize: 12, color: Colors.textMuted, marginTop: 3 },
  loanDueOverdue: { color: Colors.error, fontWeight: '600' },
  pendingText: { fontSize: 12, color: '#d97706', fontWeight: '600', marginTop: 3 },

  // Overdue alert
  overdueAlert: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.errorBg, borderRadius: 10, padding: 12,
    marginBottom: 20, borderLeftWidth: 3, borderLeftColor: Colors.error,
  },
  overdueAlertText: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.error },

  // Quick actions
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  quickCard: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: 16,
    alignItems: 'center', width: '22.5%', flex: 1,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4,
  },
  quickLabel: { marginTop: 6, fontSize: 11, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center' },

  // Recommended books
  bookScroll: { gap: 12, paddingRight: 4 },
  bookCard: { width: 130, backgroundColor: Colors.surface, borderRadius: 12, overflow: 'hidden', elevation: 2 },
  bookCover: {
    height: 100, backgroundColor: Colors.brandLight,
    justifyContent: 'center', alignItems: 'center', position: 'relative',
  },
  bookCoverImg: { width: '100%', height: '100%' },
  ebookBadge: {
    position: 'absolute', top: 6, left: 6,
    backgroundColor: Colors.brand, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  ebookBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  bookTitle: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary, padding: 8, paddingBottom: 2 },
  bookAuthor: { fontSize: 11, color: Colors.textSecond, paddingHorizontal: 8, paddingBottom: 6 },
  availBadge: { marginHorizontal: 8, marginBottom: 8, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  availText: { fontSize: 10, fontWeight: '700' },

  // FAB
  fab: {
    position: 'absolute', bottom: 24, right: 16,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.brand,
    justifyContent: 'center', alignItems: 'center',
    elevation: 6, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
});
