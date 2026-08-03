import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import Colors, { Radius } from '@/constants/colors';
import { Fonts } from '@/constants/typography';
import { BASE_URL, getBook } from '@/lib/api';

const cardShadow = {
  elevation: 2 as const,
  shadowColor: Colors.shadow,
  shadowOpacity: 0.05,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 2 },
};

export default function ReaderScreen() {
  const params = useLocalSearchParams<{ id?: string; title?: string }>();
  const router = useRouter();
  const [readerUrl, setReaderUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const title = params.title ? decodeURIComponent(params.title) : 'eBook Reader';

  const buildUrl = async () => {
    if (!params.id) return null;

    try {
      const res = await getBook(params.id);
      const book = res.data?.book ?? res.data;
      const pdfUrl: string | undefined = book?.ebookUrl;

      if (pdfUrl) {
        return `https://docs.google.com/viewer?embedded=true&url=${encodeURIComponent(pdfUrl)}`;
      }
    } catch {
      // Fall through to the legacy redirect path below.
    }

    const token = await SecureStore.getItemAsync('session_token');
    if (!token) return null;

    const authUrl = `${BASE_URL}/ebooks/${params.id}/view-redirect?token=${encodeURIComponent(token)}`;
    const res = await fetch(authUrl);
    if (!res.ok) return null;

    const data = await res.json();
    const pdfUrl: string | undefined = data.pdfUrl;
    if (!pdfUrl) return null;

    return `https://docs.google.com/viewer?embedded=true&url=${encodeURIComponent(pdfUrl)}`;
  };

  useEffect(() => {
    if (!params.id) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      const url = await buildUrl();
      if (cancelled) return;

      if (url) {
        setReaderUrl(url);
      } else {
        setLoading(false);
        setError('We could not load the eBook reader. Please try again.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params.id]);

  const handleRetry = () => {
    if (!params.id) return;

    setError(null);
    setLoading(true);
    setReaderUrl(null);

    void buildUrl().then((url) => {
      if (url) {
        setReaderUrl(url);
      } else {
        setLoading(false);
        setError('We could not load the eBook reader. Please try again.');
      }
    });
  };

  if (!params.id) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={Colors.error} />
          <Text style={styles.errorTitle}>eBook Not Available</Text>
          <Text style={styles.errorMessage}>
            No eBook ID was provided. Please try again from the book details page.
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={18} color="#fff" />
            <Text style={styles.retryBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.noticeRow}>
        <Ionicons name="lock-closed-outline" size={16} color={Colors.textSecond} />
        <Text style={styles.noticeText}>This eBook is for viewing only. Downloads are not permitted.</Text>
      </View>

      <View style={{ flex: 1 }}>
        {readerUrl && !error ? (
          <WebView
            source={{ uri: readerUrl }}
            style={{ flex: 1 }}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError('We could not load the eBook reader. Please try again.');
            }}
            javaScriptEnabled
            domStorageEnabled
            scalesPageToFit
            allowsInlineMediaPlayback
            onShouldStartLoadWithRequest={() => true}
          />
        ) : null}

        {error ? (
        <View style={styles.errorOverlay}>
          <View style={styles.errorContent}>
            <Ionicons name="alert-circle" size={64} color={Colors.error} />
            <Text style={styles.errorTitle}>Could Not Open eBook</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
              <Ionicons name="refresh" size={18} color="#fff" />
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
        ) : loading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>The eBook is opening in the reader.</Text>
        </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
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
  backButton: { padding: 4, width: 32 },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.surfaceMuted,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.body,
    color: Colors.textSecond,
    lineHeight: 18,
  },
  loadingOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.textSecond,
    textAlign: 'center',
  },
  errorOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  errorContent: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.textSecond,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  retryBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.container,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 4,
    shadowColor: Colors.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  retryBtnText: {
    color: '#fff',
    fontFamily: Fonts.bodySemiBold,
    fontSize: 16,
  },
});
