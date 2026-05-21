import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Image,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import Colors, { Radius } from '@/constants/colors';
import { Fonts } from '@/constants/typography';
import { getStories } from '@/lib/api';
import { BASE_URL } from '@/lib/api';

interface Story {
  _id: string;
  title: string;
  description?: string;
  driveFileId: string;
  thumbnailUrl?: string;
  ageGroup?: string;
  duration?: string;
  author?: string;
}

const AGE_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  '3-5':     { bg: '#FEF3C7', text: '#92400E' },
  '6-8':     { bg: '#DBEAFE', text: '#1E40AF' },
  '9-12':    { bg: '#F3E8FF', text: '#6B21A8' },
  'All Ages': { bg: Colors.accentMuted, text: Colors.accentDark },
};

function AgeBadge({ ageGroup }: { ageGroup: string }) {
  const colors = AGE_BADGE_COLORS[ageGroup] ?? { bg: Colors.surfaceMuted, text: Colors.textSecond };
  return (
    <View style={[styles.ageBadge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.ageBadgeText, { color: colors.text }]}>
        Ages {ageGroup}
      </Text>
    </View>
  );
}

function VideoModal({
  story,
  visible,
  onClose,
}: {
  story: Story | null;
  visible: boolean;
  onClose: () => void;
}) {
  if (!story) return null;

  // Stream the video through our own API proxy so auth cookies are forwarded
  const videoUrl = `${BASE_URL}/stories/video/${story.driveFileId}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; background: #000; }
          body { display: flex; align-items: center; justify-content: center; height: 100vh; }
          video { width: 100%; max-height: 100vh; }
        </style>
      </head>
      <body>
        <video src="${videoUrl}" controls autoplay playsinline></video>
      </body>
    </html>
  `;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaView style={styles.modalSafe}>
        <View style={styles.modalHeader}>
          <View style={styles.modalTitleWrap}>
            <Text style={styles.modalTitle} numberOfLines={1}>{story.title}</Text>
            {story.author ? (
              <Text style={styles.modalSubtitle}>Narrated by {story.author}</Text>
            ) : null}
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} accessibilityLabel="Close video">
            <Ionicons name="close" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.webviewWrap}>
          <WebView
            source={{ html }}
            style={styles.webview}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            originWhitelist={['*']}
          />
        </View>

        {story.description ? (
          <View style={styles.modalDesc}>
            <Text style={styles.modalDescText}>{story.description}</Text>
          </View>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

function StoryCard({
  story,
  onPlay,
}: {
  story: Story;
  onPlay: (story: Story) => void;
}) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPlay(story)}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Play story: ${story.title}`}
    >
      {/* Thumbnail */}
      <View style={styles.thumbWrap}>
        {story.thumbnailUrl ? (
          <Image
            source={{ uri: story.thumbnailUrl }}
            style={styles.thumb}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            <Ionicons name="play-circle-outline" size={36} color={Colors.accent} />
          </View>
        )}
        {/* Play overlay */}
        <View style={styles.playOverlay}>
          <View style={styles.playCircle}>
            <Ionicons name="play" size={18} color={Colors.accent} style={{ marginLeft: 2 }} />
          </View>
        </View>
      </View>

      {/* Info */}
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={2}>{story.title}</Text>

        {story.description ? (
          <Text style={styles.cardDesc} numberOfLines={2}>{story.description}</Text>
        ) : null}

        <View style={styles.cardMeta}>
          {story.author ? (
            <View style={styles.metaItem}>
              <Ionicons name="mic-outline" size={12} color={Colors.textMuted} />
              <Text style={styles.metaText}>{story.author}</Text>
            </View>
          ) : null}
          {story.duration ? (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
              <Text style={styles.metaText}>{story.duration}</Text>
            </View>
          ) : null}
        </View>

        {story.ageGroup ? <AgeBadge ageGroup={story.ageGroup} /> : null}
      </View>
    </TouchableOpacity>
  );
}

export default function StoriesScreen() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState<Story | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const res = await getStories();
      setStories(res.data.stories ?? []);
    } catch {
      setError('Could not load stories. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const onRefresh = () => { setRefreshing(true); load(true); };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={stories}
        keyExtractor={(s) => s._id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.accent]} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Storytelling</Text>
            <Text style={styles.headerSub}>Watch and listen to stories for all ages</Text>
          </View>
        }
        ListEmptyComponent={
          error ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="alert-circle-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyText}>{error}</Text>
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <Ionicons name="book-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No stories yet</Text>
              <Text style={styles.emptyText}>Check back soon for new storytelling videos.</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <StoryCard story={item} onPlay={setPlaying} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      <VideoModal
        story={playing}
        visible={!!playing}
        onClose={() => setPlaying(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  list: { padding: 16, paddingBottom: 40 },

  header: { marginBottom: 20 },
  headerTitle: {
    fontSize: 26,
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.textSecond,
    marginTop: 4,
  },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.container,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  thumbWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    position: 'relative',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    backgroundColor: Colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  playCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  cardInfo: { padding: 14 },
  cardTitle: {
    fontSize: 15,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: Colors.textSecond,
    lineHeight: 18,
    marginBottom: 8,
  },
  cardMeta: { flexDirection: 'row', gap: 12, marginBottom: 8, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, fontFamily: Fonts.body, color: Colors.textMuted },

  ageBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.inner,
    marginTop: 2,
  },
  ageBadgeText: { fontSize: 11, fontFamily: Fonts.bodyBold },

  separator: { height: 12 },

  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontFamily: Fonts.bodySemiBold, color: Colors.textPrimary },
  emptyText: { fontSize: 14, fontFamily: Fonts.body, color: Colors.textSecond, textAlign: 'center', paddingHorizontal: 24 },

  // Modal
  modalSafe: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#111',
    gap: 12,
  },
  modalTitleWrap: { flex: 1 },
  modalTitle: {
    fontSize: 15,
    fontFamily: Fonts.bodySemiBold,
    color: '#fff',
  },
  modalSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webviewWrap: { flex: 1, backgroundColor: '#000' },
  webview: { flex: 1, backgroundColor: '#000' },
  modalDesc: {
    padding: 16,
    backgroundColor: '#111',
  },
  modalDescText: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 20,
  },
});
