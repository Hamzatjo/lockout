import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { colors, typography } from '../theme';
import { supabase, Database } from '../lib/supabase';
import ChallengeCard from '../components/ChallengeCard';

type Challenge = Database['public']['Tables']['challenges']['Row'];
type ChallengeParticipant = Database['public']['Tables']['challenge_participants']['Row'];

interface ChallengeWithParticipation extends Challenge {
  userParticipation?: ChallengeParticipant;
  isCompleted: boolean;
}

interface ChallengesScreenProps {
  navigation: any;
}

export default function ChallengesScreen({ navigation }: ChallengesScreenProps) {
  const [challenges, setChallenges] = useState<ChallengeWithParticipation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchChallenges();
    }, [])
  );

  const fetchChallenges = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);

      // Get user's squad
      const { data: membership } = await supabase
        .from('squad_members')
        .select('squad_id')
        .eq('user_id', user.id)
        .single();

      if (!membership) {
        setChallenges([]);
        return;
      }

      // Get squad challenges
      const { data: challengesData, error: challengesError } = await supabase
        .from('challenges')
        .select('*')
        .eq('squad_id', membership.squad_id)
        .order('created_at', { ascending: false });

      if (challengesError) throw challengesError;

      // Get user's participation in these challenges
      const challengeIds = challengesData?.map(c => c.id) || [];
      const { data: participationData } = await supabase
        .from('challenge_participants')
        .select('*')
        .eq('user_id', user.id)
        .in('challenge_id', challengeIds);

      // Combine challenges with participation data
      const challengesWithParticipation: ChallengeWithParticipation[] = (challengesData || []).map(challenge => {
        const userParticipation = participationData?.find(p => p.challenge_id === challenge.id);
        const isCompleted = userParticipation?.completed_at != null ||
          (challenge.challenge_type === 'group' && challenge.current_value >= challenge.target_value);

        return {
          ...challenge,
          userParticipation,
          isCompleted,
        };
      });

      setChallenges(challengesWithParticipation);
    } catch (error) {
      console.error('Error fetching challenges:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchChallenges();
  };

  const getFilteredChallenges = (filter: 'active' | 'completed' | 'upcoming') => {
    const now = new Date();
    return challenges.filter(challenge => {
      switch (filter) {
        case 'active':
          return challenge.is_active &&
            new Date(challenge.starts_at) <= now &&
            new Date(challenge.ends_at) > now &&
            !challenge.isCompleted;
        case 'completed':
          return challenge.isCompleted;
        case 'upcoming':
          return new Date(challenge.starts_at) > now;
        default:
          return true;
      }
    });
  };

  const activeChallenges = getFilteredChallenges('active');
  const completedChallenges = getFilteredChallenges('completed');
  const upcomingChallenges = getFilteredChallenges('upcoming');

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // No squad state
  if (challenges.length === 0 && !loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>CHALLENGES</Text>
        </View>

        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🏆</Text>
          <Text style={styles.emptyTitle}>No Challenges Yet</Text>
          <Text style={styles.emptyText}>
            Join a squad to participate in challenges and compete with your crew!
          </Text>
          <TouchableOpacity
            style={styles.joinSquadButton}
            onPress={() => navigation.navigate('Squad')}
          >
            <Text style={styles.joinSquadText}>Find Your Squad</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>CHALLENGES</Text>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Active Challenges */}
        {activeChallenges.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔥 ACTIVE CHALLENGES</Text>
            {activeChallenges.map(challenge => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                userParticipation={challenge.userParticipation}
                isCompleted={challenge.isCompleted}
              />
            ))}
          </View>
        )}

        {/* Upcoming Challenges */}
        {upcomingChallenges.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⏰ UPCOMING</Text>
            {upcomingChallenges.map(challenge => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                userParticipation={challenge.userParticipation}
                isCompleted={challenge.isCompleted}
              />
            ))}
          </View>
        )}

        {/* Completed Challenges */}
        {completedChallenges.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✅ COMPLETED</Text>
            {completedChallenges.map(challenge => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                userParticipation={challenge.userParticipation}
                isCompleted={challenge.isCompleted}
              />
            ))}
          </View>
        )}

        {/* AI Commissioner Info */}
        <View style={styles.aiSection}>
          <Text style={styles.aiTitle}>🤖 AI Commissioner</Text>
          <Text style={styles.aiDescription}>
            New challenges are automatically generated based on your squad's activity and performance.
            Keep checking in to unlock more exciting challenges!
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...typography.labelLarge,
    color: colors.primary,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 24,
  },
  sectionTitle: {
    ...typography.labelMedium,
    color: colors.textMuted,
    marginBottom: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 24,
  },
  emptyTitle: {
    ...typography.headlineLarge,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  emptyText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  joinSquadButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  joinSquadText: {
    ...typography.labelLarge,
    color: colors.background,
  },
  aiSection: {
    margin: 24,
    padding: 20,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accent + '30',
  },
  aiTitle: {
    ...typography.headlineSmall,
    color: colors.accent,
    marginBottom: 8,
  },
  aiDescription: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});