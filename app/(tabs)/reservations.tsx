import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getHistory } from '@/lib/api';
import Colors from '@/constants/colors';

interface Reservation {
  _id: string;
  bookTitle: string;
  bookAuthor: string;
  bookCover?: string;
  checkoutDate: string;
  dueDate: string;
  status: 'pending_pickup' | 'active' | 'expired';
  pickupDeadline?: string;
  pickupConfirmedAt?: string;
}

export default function ReservationsScreen() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReservations = useCallback(async () => {
    try {
      const res = await getHistory();
      const allHistory = res.data.history;
      
      // Filter only pending_pickup, active (recently picked up), and expired reservations
      const filtered = allHistory.filter((item: Reservation) => 
        item.status === 'pending_pickup' || 
        item.status === 'expired' ||
        (item.status === 'active' && item.pickupConfirmedAt)
      );
      
      setReservations(filtered);
    } catch (err) {
      console.error('Failed to fetch reservations:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReservations();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReservations();
  };

  const getStatusConfig = (status: Reservation['status']) => {
    switch (status) {
      case 'pending_pickup':
        return {
          color: '#f59e0b',
          bg: '#fef3c7',
          label: 'Ready for Pickup',
          icon: 'time-outline' as const,
          description: 'Your book is ready! Please pick it up before the deadline.',
        };
      case 'active':
        return {
          color: Colors.brand,
          bg: Colors.brandLight,
          label: 'Picked Up',
          icon: 'checkmark-circle-outline' as const,
          description: 'You have successfully picked up this book.',
        };
      case 'expired':
        return {
          color: '#6b7280',
          bg: '#f3f4f6',
          label: 'Expired',
          icon: 'close-circle-outline' as const,
          description: 'Pickup deadline has passed. Reservation cancelled.',
        };
      default:
        return {
          color: Colors.textMuted,
          bg: '#f3f4f6',
          label: 'Unknown',
          icon: 'help-circle-outline' as const,
          description: '',
        };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeRemaining = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffMs = deadlineDate.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffMs < 0) return 'Expired';
    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} left`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} left`;
    return 'Less than 1 hour';
  };

  const renderReservation = ({ item }: { item: Reservation }) => {
    const config = getStatusConfig(item.status);
    const isPending = item.status === 'pending_pickup';
    const isExpired = item.status === 'expired';

    return (
      <View style={[
        styles.card,
        isPending && styles.pendingCard,
        isExpired && styles.expiredCard,
      ]}>
        {/* Status Header */}
        <View style={[styles.statusHeader, { backgroundColor: config.bg }]}>
          <View style={styles.statusLeft}>
            <Ionicons name={config.icon} size={20} color={config.color} />
            <Text style={[styles.statusLabel, { color: config.color }]}>{config.label}</Text>
          </View>
          {isPending && item.pickupDeadline && (
            <View style={styles.timeChip}>
              <Ionicons name="alarm-outline" size={14} color={config.color} />
              <Text style={[styles.timeText, { color: config.color }]}>
                {getTimeRemaining(item.pickupDeadline)}
              </Text>
            </View>
          )}
        </View>

        {/* Book Info */}
        <View style={styles.bookInfo}>
          <View style={styles.bookIcon}>
            <Ionicons name="book" size={24} color={Colors.brand} />
          </View>
          <View style={styles.bookDetails}>
            <Text style={styles.bookTitle} numberOfLines={2}>{item.bookTitle}</Text>
            <Text style={styles.bookAuthor}>{item.bookAuthor}</Text>
          </View>
        </View>

        {/* Timeline */}
        <View style={styles.timeline}>
          <View style={styles.timelineItem}>
            <View style={styles.timelineDot} />
            <View style={styles.timelineContent}>
              <Text style={styles.timelineLabel}>Reserved</Text>
              <Text style={styles.timelineDate}>{formatDate(item.checkoutDate)}</Text>
            </View>
          </View>

          {item.pickupDeadline && (
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, isPending && styles.timelineDotActive]} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineLabel}>Pickup Deadline</Text>
                <Text style={[styles.timelineDate, isPending && styles.timelineDateActive]}>
                  {formatDate(item.pickupDeadline)}
                </Text>
              </View>
            </View>
          )}

          {item.pickupConfirmedAt && (
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, styles.timelineDotComplete]} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineLabel}>Picked Up</Text>
                <Text style={styles.timelineDate}>{formatDate(item.pickupConfirmedAt)}</Text>
              </View>
            </View>
          )}

          {item.status === 'active' && (
            <View style={styles.timelineItem}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineLabel}>Due Date</Text>
                <Text style={styles.timelineDate}>{formatDate(item.dueDate)}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Description */}
        <View style={[styles.description, { backgroundColor: config.bg }]}>
          <Text style={[styles.descriptionText, { color: config.color }]}>
            {config.description}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.brand} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={reservations}
        keyExtractor={(item) => item._id}
        renderItem={renderReservation}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.brand]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No Active Reservations</Text>
            <Text style={styles.emptyText}>
              Browse the catalog and reserve books to see them here
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  pendingCard: {
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  expiredCard: {
    opacity: 0.7,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bookInfo: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  bookIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.brandMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookDetails: {
    flex: 1,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 14,
    color: Colors.textSecond,
  },
  timeline: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.border,
    marginTop: 4,
    marginRight: 12,
  },
  timelineDotActive: {
    backgroundColor: '#f59e0b',
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  timelineDotComplete: {
    backgroundColor: Colors.brand,
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  timelineDate: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  timelineDateActive: {
    color: '#f59e0b',
    fontWeight: '600',
  },
  description: {
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  descriptionText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
