import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  RefreshControl, Image, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '@/lib/api';
import Colors, { Radius } from '@/constants/colors';
import { Fonts } from '@/constants/typography';

const cardShadow = {
  elevation: 2 as const,
  shadowColor: Colors.shadow,
  shadowOpacity: 0.05,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 2 },
};

interface Event {
  _id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location?: string;
  imageUrl?: string;
  isHighlighted: boolean;
}

export default function EventsScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEvents = async () => {
    try {
      const response = await api.get('/events');
      setEvents(response.data.events || []);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-PH', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isUpcoming = (startDate: string) => {
    return new Date(startDate) > new Date();
  };

  const isPast = (endDate: string) => {
    return new Date(endDate) < new Date();
  };

  const isOngoing = (startDate: string, endDate: string) => {
    const now = new Date();
    return new Date(startDate) <= now && new Date(endDate) >= now;
  };

  const getEventStatus = (event: Event) => {
    if (isOngoing(event.startDate, event.endDate)) {
      return { label: 'Ongoing', color: Colors.accent, bg: Colors.accentMuted };
    }
    if (isUpcoming(event.startDate)) {
      return { label: 'Upcoming', color: Colors.accentDark, bg: Colors.accentMuted };
    }
    return { label: 'Past', color: Colors.statusReturned, bg: Colors.statusReturnedBg };
  };

  const renderEvent = ({ item }: { item: Event }) => {
    const status = getEventStatus(item);
    const sameDay = new Date(item.startDate).toDateString() === new Date(item.endDate).toDateString();

    return (
      <View style={[styles.eventCard, item.isHighlighted && styles.highlightedCard]}>
        {item.isHighlighted && (
          <View style={styles.highlightBadge}>
            <Ionicons name="star" size={12} color="#fff" />
            <Text style={styles.highlightText}>Featured</Text>
          </View>
        )}

        {/* Image */}
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.eventImage} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="calendar" size={48} color={Colors.accent} />
          </View>
        )}

        {/* Content */}
        <View style={styles.eventContent}>
          {/* Status Badge */}
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>

          {/* Title */}
          <Text style={styles.eventTitle}>{item.title}</Text>

          {/* Date & Time */}
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color={Colors.textSecond} />
            <Text style={styles.infoText}>
              {sameDay
                ? formatDate(item.startDate)
                : `${formatDate(item.startDate)} - ${formatDate(item.endDate)}`}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color={Colors.textSecond} />
            <Text style={styles.infoText}>
              {formatTime(item.startDate)} - {formatTime(item.endDate)}
            </Text>
          </View>

          {/* Location */}
          {item.location && (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={16} color={Colors.textSecond} />
              <Text style={styles.infoText}>{item.location}</Text>
            </View>
          )}

          {/* Description */}
          <Text style={styles.eventDescription} numberOfLines={3}>
            {item.description}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Events</Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={events}
        keyExtractor={(item) => item._id}
        renderItem={renderEvent}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.accent]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No Events</Text>
            <Text style={styles.emptyText}>Check back later for upcoming events</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centerContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background,
  },
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
  headerTitle: { fontSize: 20, fontFamily: Fonts.heading, color: Colors.textPrimary, flex: 1 },
  headerSpacer: { width: 40 },
  listContent: { padding: 16 },
  eventCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.container,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    ...cardShadow,
  },
  highlightedCard: { borderWidth: 2, borderColor: Colors.accent },
  highlightBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.inner,
    zIndex: 1,
  },
  highlightText: { color: '#fff', fontSize: 11, fontFamily: Fonts.bodyBold },
  eventImage: { width: '100%', height: 180 },
  imagePlaceholder: {
    width: '100%', height: 180, backgroundColor: Colors.accentMuted,
    justifyContent: 'center', alignItems: 'center',
  },
  eventContent: { padding: 16 },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.inner,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 11,
    fontFamily: Fonts.bodyBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  eventTitle: {
    fontSize: 18, fontFamily: Fonts.heading, color: Colors.textPrimary, marginBottom: 12,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  infoText: { fontSize: 13, fontFamily: Fonts.body, color: Colors.textSecond },
  eventDescription: {
    fontSize: 14, fontFamily: Fonts.body, color: Colors.textSecond, lineHeight: 20, marginTop: 8,
  },
  emptyContainer: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 32 },
  emptyTitle: {
    fontSize: 18, fontFamily: Fonts.heading, color: Colors.textPrimary, marginTop: 16, marginBottom: 8,
  },
  emptyText: { fontSize: 14, fontFamily: Fonts.body, color: Colors.textMuted, textAlign: 'center' },
});
