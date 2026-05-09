import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, typography } from '../theme';
import { Database, supabase } from '../lib/supabase';

type Challenge = Database['public']['Tables']['challenges']['Row'];
type ChallengeParticipant = Database['public']['Tables']['challenge_participants']['Row'];

interface ChallengeCardProps {
  challenge: Challenge;
  userParticipation?: ChallengeParticipant;
  isCompleted?: boolean;
  onParticipationChange?: () => void;
}

export default function ChallengeCard({
  challenge,
  userParticipation,
  isCompleted = false,
  onParticipationChange
}: ChallengeCardProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const endDate = new Date(challenge.ends_at);
      const timeDiff = endDate.getTime() - now.getTime();

      if (timeDiff <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h left`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m left`);
      } else {
        setTimeLeft(`${minutes}m left`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [challenge.ends_at]);

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
    if (isCompleted) return 'Completed ✅';
    if (new Date(challenge.ends_at) < new Date()) return 'Expired';
    if (new Date(challenge.starts_at) > new Date()) return 'Upcoming';
    return 'Active';
  };

  const joinChallenge = async () => {
    try {
      // Light haptic feedback on button press
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        // Haptics not supported on device, continue silently
      }

      setJoining(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('challenge_participants')
        .insert({
          challenge_id: challenge.id,
          user_id: user.id,
          progress: 0,
        });

      if (error) throw error;

      // Success haptic feedback
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        // Haptics not supported on device, continue silently
      }

      onParticipationChange?.();
    } catch (error) {
      console.error('Error joining challenge:', error);
      Alert.alert('Error', 'Failed to join challenge. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  const progressPercentage = getProgressPercentage();
  const statusColor = getStatusColor();
  const isActive = new Date(challenge.starts_at) <= new Date() && new Date(challenge.ends_at) > new Date();
  const canJoin = challenge.challenge_type === 'individual' && !userParticipation && isActive && !isCompleted;

  return (
    <View style={[styles.container, isCompleted && styles.completedContainer]}>
      {/* Completed Badge */}
      {isCompleted && (
        <View style={styles.completedBadge}>
          <Text style={styles.completedBadgeText}>🎉 COMPLETED! 🎉</Text>
        </View>
      )}

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

      {/* Countdown Timer */}
      {isActive && !isCompleted && (
        <View style={styles.countdownContainer}>
          <Text style={styles.countdownIcon}>⏰</Text>
          <Text style={styles.countdownText}>{timeLeft}</Text>
        </View>
      )}

      {/* Join Challenge Button */}
      {canJoin && (
        <TouchableOpacity
          style={styles.joinButton}
          onPress={joinChallenge}
          disabled={joining}
        >
          <Text style={styles.joinButtonText}>
            {joining ? 'Joining...' : '🚀 Join Challenge'}
          </Text>
        </TouchableOpacity>
      )}

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
  completedBadge: {
    position: 'absolute',
    top: -8,
    left: 16,
    right: 16,
    backgroundColor: colors.success,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
    zIndex: 1,
    alignItems: 'center',
  },
  completedBadgeText: {
    ...typography.labelSmall,
    color: colors.background,
    fontWeight: '700',
    fontSize: 10,
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.warning + '20',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    gap: 6,
  },
  countdownIcon: {
    fontSize: 14,
  },
  countdownText: {
    ...typography.labelMedium,
    color: colors.warning,
    fontWeight: '600',
  },
  joinButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  joinButtonText: {
    ...typography.labelMedium,
    color: colors.background,
    fontWeight: '600',
  },
});