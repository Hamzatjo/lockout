import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography } from '../theme';
import { Database } from '../lib/supabase';

type Challenge = Database['public']['Tables']['challenges']['Row'];
type ChallengeParticipant = Database['public']['Tables']['challenge_participants']['Row'];

interface ChallengeCardProps {
  challenge: Challenge;
  userParticipation?: ChallengeParticipant;
  isCompleted?: boolean;
}

export default function ChallengeCard({
  challenge,
  userParticipation,
  isCompleted = false
}: ChallengeCardProps) {
  const getProgressPercentage = () => {
    if (challenge.challenge_type === 'individual') {
      const progress = userParticipation?.progress || 0;
      return Math.min((progress / challenge.target_value) * 100, 100);
    } else {
      return Math.min((challenge.current_value / challenge.target_value) * 100, 100);
    }
  };

  const getProgressText = () => {
    if (challenge.challenge_type === 'individual') {
      const progress = userParticipation?.progress || 0;
      return `${progress}/${challenge.target_value}`;
    } else {
      return `${challenge.current_value}/${challenge.target_value}`;
    }
  };

  const getStatusColor = () => {
    if (isCompleted) return colors.success;
    if (new Date(challenge.ends_at) < new Date()) return colors.textMuted;
    return colors.primary;
  };

  const getStatusText = () => {
    if (isCompleted) return 'Completed';
    if (new Date(challenge.ends_at) < new Date()) return 'Expired';
    if (new Date(challenge.starts_at) > new Date()) return 'Upcoming';
    return 'Active';
  };

  const progressPercentage = getProgressPercentage();
  const statusColor = getStatusColor();

  return (
    <View style={[styles.container, isCompleted && styles.completedContainer]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{challenge.title}</Text>
          <View style={[styles.typeBadge, { backgroundColor: challenge.challenge_type === 'individual' ? colors.accent + '20' : colors.primary + '20' }]}>
            <Text style={[styles.typeText, { color: challenge.challenge_type === 'individual' ? colors.accent : colors.primary }]}>
              {challenge.challenge_type === 'individual' ? '👤 Solo' : '👥 Squad'}
            </Text>
          </View>
        </View>
        <Text style={styles.description}>{challenge.description}</Text>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressText}>{getProgressText()}</Text>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {getStatusText()}
          </Text>
        </View>

        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${progressPercentage}%`,
                  backgroundColor: statusColor
                }
              ]}
            />
          </View>
          <Text style={styles.progressPercentage}>{Math.round(progressPercentage)}%</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.reward}>🏆 {challenge.point_reward} pts</Text>
        <Text style={styles.timeframe}>
          {new Date(challenge.starts_at).toLocaleDateString()} - {new Date(challenge.ends_at).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  completedContainer: {
    backgroundColor: colors.success + '10',
    borderColor: colors.success + '30',
  },
  header: {
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    ...typography.headlineSmall,
    color: colors.textPrimary,
    flex: 1,
    marginRight: 12,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeText: {
    ...typography.labelSmall,
    fontSize: 10,
  },
  description: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  progressSection: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    ...typography.labelMedium,
    color: colors.textPrimary,
  },
  statusText: {
    ...typography.labelSmall,
    fontWeight: '600',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercentage: {
    ...typography.labelSmall,
    color: colors.textMuted,
    minWidth: 35,
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reward: {
    ...typography.labelMedium,
    color: colors.warning,
  },
  timeframe: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
});