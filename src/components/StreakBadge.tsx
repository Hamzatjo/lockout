import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface StreakBadgeProps {
  streak: number;
  mode?: 'compact' | 'full';
}

export const StreakBadge: React.FC<StreakBadgeProps> = ({
  streak,
  mode = 'compact'
}) => {
  const getStreakTier = (streakCount: number) => {
    if (streakCount >= 30) {
      return {
        size: mode === 'full' ? 'legendary' : 'large',
        glowColor: colors.accent, // Purple
        textSize: mode === 'full' ? 24 : 16,
        emoji: '🔥',
        shadowRadius: mode === 'full' ? 12 : 8,
      };
    } else if (streakCount >= 14) {
      return {
        size: mode === 'full' ? 'large' : 'medium',
        glowColor: colors.error, // Red
        textSize: mode === 'full' ? 20 : 14,
        emoji: '🔥',
        shadowRadius: mode === 'full' ? 10 : 6,
      };
    } else if (streakCount >= 7) {
      return {
        size: mode === 'full' ? 'medium' : 'small',
        glowColor: colors.warning, // Orange
        textSize: mode === 'full' ? 18 : 12,
        emoji: '🔥',
        shadowRadius: mode === 'full' ? 8 : 4,
      };
    } else {
      return {
        size: 'small',
        glowColor: colors.textSecondary,
        textSize: mode === 'full' ? 16 : 12,
        emoji: '🔥',
        shadowRadius: 0,
      };
    }
  };

  const tier = getStreakTier(streak);

  const containerStyle = [
    styles.container,
    mode === 'full' ? styles.fullContainer : styles.compactContainer,
    tier.shadowRadius > 0 && {
      shadowColor: tier.glowColor,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: tier.shadowRadius,
      elevation: tier.shadowRadius,
    },
  ];

  const textStyle = [
    styles.text,
    {
      fontSize: tier.textSize,
      color: tier.glowColor === colors.textSecondary ? colors.textPrimary : tier.glowColor,
    },
  ];

  if (streak === 0) {
    return null;
  }

  return (
    <View style={containerStyle}>
      <Text style={[textStyle, styles.emoji]}>{tier.emoji}</Text>
      <Text style={textStyle}>{streak}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  compactContainer: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  fullContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  text: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
  emoji: {
    marginRight: 4,
  },
});