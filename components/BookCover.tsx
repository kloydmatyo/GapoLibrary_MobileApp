import { useState } from 'react';
import { View, Image, StyleSheet, ViewStyle, ImageStyle } from 'react-native';
import { resolveCoverUri, openLibraryCoverByTitle } from '@/lib/covers';
import Colors from '@/constants/colors';
import { Radius } from '@/constants/colors';

interface BookCoverProps {
  isbn?: string | null;
  coverImageUrl?: string | null;
  title?: string | null;
  author?: string | null;
  width: number;
  height: number;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
}

/**
 * Displays a book cover image.
 * Resolution order:
 *   1. Stored coverImageUrl
 *   2. Open Library by ISBN
 *   3. Open Library by title (on error or when no ISBN)
 */
export default function BookCover({
  isbn,
  coverImageUrl,
  title,
  author,
  width,
  height,
  style,
  imageStyle,
}: BookCoverProps) {
  const [uri, setUri] = useState<string | null>(() =>
    resolveCoverUri(coverImageUrl, isbn, title),
  );
  const [failed, setFailed] = useState(false);

  if (!uri || failed) {
    return <View style={[styles.empty, { width, height }, style]} />;
  }

  return (
    <View style={[{ width, height }, style]}>
      <Image
        source={{ uri }}
        style={[styles.image, { width, height }, imageStyle]}
        onError={() => {
          // If the current URI failed, try Open Library by title as a last resort
          const titleFallback = openLibraryCoverByTitle(title);
          if (titleFallback && titleFallback !== uri) {
            setUri(titleFallback);
          } else {
            setFailed(true);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.inner,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  image: {
    borderRadius: Radius.inner,
    backgroundColor: Colors.surfaceMuted,
  },
});
