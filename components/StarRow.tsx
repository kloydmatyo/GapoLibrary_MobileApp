import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';
import { Fonts } from '@/constants/typography';

export const SCORE_LABELS: Record<number, string> = {
  1: 'Needs Improvement',
  2: 'Satisfactory',
  3: 'Excellent',
};

const RATING_OPTIONS = [
  { score: 3, label: 'Excellent', description: 'Very helpful and professional' },
  { score: 2, label: 'Satisfactory', description: 'Met expectations' },
  { score: 1, label: 'Needs Improvement', description: 'Service could be better' },
] as const;

const REACTION_COLORS: Record<number, string> = {
  1: Colors.error,
  2: '#f59e0b',
  3: '#16a34a',
};

export default function ReactionRow({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.container}>
      {RATING_OPTIONS.map(({ score, label, description }) => {
        const selected = value === score;
        const stripeColor = REACTION_COLORS[score];
        return (
          <TouchableOpacity
            key={score}
            onPress={() => onChange(score)}
            style={[styles.optionCard, selected && styles.optionCardSelected]}
            activeOpacity={0.9}
          >
            <View style={[styles.stripe, { backgroundColor: stripeColor }]} />
            <View style={styles.textWrap}>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.description}>{description}</Text>
            </View>
            <View style={[styles.radioOuter, selected && { borderColor: stripeColor }]}> 
              {selected ? <View style={[styles.radioInner, { backgroundColor: stripeColor }]} /> : null}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    marginBottom: 8,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 12,
    paddingRight: 14,
    overflow: 'hidden',
  },
  optionCardSelected: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentMuted,
  },
  stripe: {
    width: 4,
    alignSelf: 'stretch',
    marginRight: 12,
  },
  textWrap: {
    flex: 1,
    minHeight: 42,
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textPrimary,
  },
  description: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: Fonts.body,
    color: Colors.textSecond,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
