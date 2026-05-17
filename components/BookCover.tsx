import { useState } from 'react';
import { View, Image, StyleSheet, ViewStyle, ImageStyle } from 'react-native';
import { resolveCoverUri } from '@/lib/covers';
import Colors from '@/constants/colors';
import { Radius } from '@/constants/colors';

interface BookCoverProps {
  isbn?: string | null;
  coverImageUrl?: string | null;
  width: number;
  height: number;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
}

/** Real cover from API or Open Library — empty slot if unavailable. */
export default function BookCover({
  isbn,
  coverImageUrl,
  width,
  height,
  style,
  imageStyle,
}: BookCoverProps) {
  const uri = resolveCoverUri(coverImageUrl, isbn);
  const [failed, setFailed] = useState(false);

  if (!uri || failed) {
    return (
      <View style={[styles.empty, { width, height }, style]} />
    );
  }

  return (
    <View style={[{ width, height }, style]}>
      <Image
        source={{ uri }}
        style={[styles.image, { width, height }, imageStyle]}
        onError={() => setFailed(true)}
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
