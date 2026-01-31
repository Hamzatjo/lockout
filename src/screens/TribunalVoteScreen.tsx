// LOCKOUT Tribunal Vote Screen

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    FlatList,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video, ResizeMode } from 'expo-av';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { supabase, Database } from '../lib/supabase';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Workout = Database['public']['Tables']['workouts']['Row'] & {
    profiles: { username: string; avatar_url: string | null } | null;
    votes: { vote: string; user_id: string }[];
};

type Props = {
    navigation: NativeStackNavigationProp<any>;
};

export default function TribunalVoteScreen({ navigation }: Props) {
    const [pendingWorkouts, setPendingWorkouts] = useState<Workout[]>([]);
    const [loading, setLoading] = useState(true);
    const [votingWorkoutId, setVotingWorkoutId] = useState<string | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        fetchPendingWorkouts();
    }, []);

    const fetchPendingWorkouts = async () => {
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

            if (!membership) return;

            // Get pending tribunal workouts (not by current user, not yet voted)
            const { data } = await supabase
                .from('workouts')
                .select('*, profiles(username, avatar_url), votes(vote, user_id)')
                .eq('squad_id', membership.squad_id)
                .eq('verification_level', 'tribunal')
                .neq('user_id', user.id)
                .gt('expires_at', new Date().toISOString())
                .order('created_at', { ascending: false });

            if (data) {
                // Filter out workouts user already voted on
                const pending = data.filter(workout =>
                    !workout.votes?.some((vote: { user_id: string }) => vote.user_id === user.id)
                );
                setPendingWorkouts(pending as Workout[]);
            }
        } catch (error) {
            console.error('Error fetching pending workouts:', error);
        } finally {
            setLoading(false);
        }
    };

    const submitVote = async (workoutId: string, vote: 'valid' | 'cap') => {
        if (!currentUserId) return;

        setVotingWorkoutId(workoutId);
        try {
            const { error } = await supabase.from('votes').insert({
                workout_id: workoutId,
                user_id: currentUserId,
                vote,
            });

            if (error) throw error;

            // Check if voting is complete (majority reached)
            await checkVotingComplete(workoutId);

            // Remove from pending list
            setPendingWorkouts(prev => prev.filter(w => w.id !== workoutId));

            Alert.alert(
                vote === 'valid' ? '✅ VALID' : '🧢 CAP',
                vote === 'valid'
                    ? 'You validated this lift!'
                    : 'You called CAP on this one.'
            );
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to submit vote');
        } finally {
            setVotingWorkoutId(null);
        }
    };

    const checkVotingComplete = async (workoutId: string) => {
        // Get workout and all votes
        const { data: workout } = await supabase
            .from('workouts')
            .select('*, votes(vote)')
            .eq('id', workoutId)
            .single();

        if (!workout) return;

        // Get squad member count
        const { count: memberCount } = await supabase
            .from('squad_members')
            .select('*', { count: 'exact', head: true })
            .eq('squad_id', workout.squad_id);

        const votes = workout.votes || [];
        const validVotes = votes.filter((v: { vote: string }) => v.vote === 'valid').length;
        const capVotes = votes.filter((v: { vote: string }) => v.vote === 'cap').length;
        const totalVotes = votes.length;

        // Majority is (members - 1) / 2 + 1 (excluding the uploader)
        const eligibleVoters = (memberCount || 1) - 1;
        const majorityNeeded = Math.ceil(eligibleVoters / 2);

        // Check if majority reached
        if (validVotes >= majorityNeeded) {
            // Award points (10 for tribunal, 15 for PR)
            const isPR = workout.caption?.includes('PR CLAIM');
            await supabase
                .from('workouts')
                .update({ points: isPR ? 15 : 10 })
                .eq('id', workoutId);
        } else if (capVotes >= majorityNeeded) {
            // CAP - no points
            await supabase
                .from('workouts')
                .update({ points: 0 })
                .eq('id', workoutId);
        }
    };

    const renderWorkout = ({ item }: { item: Workout }) => {
        const isVoting = votingWorkoutId === item.id;
        const isPR = item.caption?.includes('PR CLAIM');

        return (
            <View style={styles.card}>
                {/* Header */}
                <View style={styles.cardHeader}>
                    <View style={styles.avatar}>
                        {item.profiles?.avatar_url ? (
                            <Image source={{ uri: item.profiles.avatar_url }} style={styles.avatarImage} />
                        ) : (
                            <Text style={styles.avatarText}>
                                {item.profiles?.username?.[0]?.toUpperCase() || '?'}
                            </Text>
                        )}
                    </View>
                    <View style={styles.cardHeaderText}>
                        <Text style={styles.username}>{item.profiles?.username || 'Unknown'}</Text>
                        <Text style={styles.timestamp}>
                            {new Date(item.created_at).toLocaleString()}
                        </Text>
                    </View>
                    {isPR && (
                        <View style={styles.prBadge}>
                            <Text style={styles.prBadgeText}>🏆 PR</Text>
                        </View>
                    )}
                </View>

                {/* Video */}
                <View style={styles.videoContainer}>
                    <Video
                        source={{ uri: item.media_url || '' }}
                        style={styles.video}
                        useNativeControls
                        resizeMode={ResizeMode.CONTAIN}
                    />
                </View>

                {/* Caption */}
                <Text style={styles.caption}>{item.caption}</Text>

                {/* Vote Buttons */}
                <View style={styles.voteContainer}>
                    <TouchableOpacity
                        style={[styles.voteButton, styles.validButton]}
                        onPress={() => submitVote(item.id, 'valid')}
                        disabled={isVoting}
                    >
                        {isVoting ? (
                            <ActivityIndicator color={colors.background} />
                        ) : (
                            <>
                                <Text style={styles.voteEmoji}>✅</Text>
                                <Text style={styles.voteText}>VALID</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.voteButton, styles.capButton]}
                        onPress={() => submitVote(item.id, 'cap')}
                        disabled={isVoting}
                    >
                        {isVoting ? (
                            <ActivityIndicator color={colors.textPrimary} />
                        ) : (
                            <>
                                <Text style={styles.voteEmoji}>🧢</Text>
                                <Text style={styles.capVoteText}>CAP</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Vote Count */}
                <View style={styles.voteCount}>
                    <Text style={styles.voteCountText}>
                        {item.votes?.length || 0} votes cast
                    </Text>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backButton}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>⚖️ TRIBUNAL</Text>
                <View style={styles.placeholder} />
            </View>

            <FlatList
                data={pendingWorkouts}
                renderItem={renderWorkout}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyEmoji}>⚖️</Text>
                        <Text style={styles.emptyTitle}>No pending judgments</Text>
                        <Text style={styles.emptyText}>
                            All lifts have been judged. Check back later!
                        </Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        ...typography.bodyLarge,
        color: colors.primary,
    },
    headerTitle: {
        ...typography.labelLarge,
        color: colors.accent,
    },
    placeholder: {
        width: 50,
    },
    list: {
        padding: spacing.md,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.lg,
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    avatarText: {
        ...typography.headlineSmall,
        color: colors.accent,
    },
    cardHeaderText: {
        flex: 1,
        marginLeft: spacing.md,
    },
    username: {
        ...typography.bodyLarge,
        color: colors.textPrimary,
        fontWeight: '600',
    },
    timestamp: {
        ...typography.bodySmall,
        color: colors.textMuted,
    },
    prBadge: {
        backgroundColor: colors.warning + '20',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.sm,
    },
    prBadgeText: {
        ...typography.labelSmall,
        color: colors.warning,
    },
    videoContainer: {
        height: 450,
        backgroundColor: colors.background,
    },
    video: {
        flex: 1,
    },
    caption: {
        ...typography.bodyMedium,
        color: colors.textPrimary,
        padding: spacing.md,
    },
    voteContainer: {
        flexDirection: 'row',
        padding: spacing.md,
        gap: spacing.md,
    },
    voteButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.md,
        borderRadius: borderRadius.md,
        gap: spacing.sm,
    },
    validButton: {
        backgroundColor: colors.valid,
        ...shadows.glow,
    },
    capButton: {
        backgroundColor: colors.error,
    },
    voteEmoji: {
        fontSize: 24,
    },
    voteText: {
        ...typography.labelLarge,
        color: colors.background,
    },
    capVoteText: {
        ...typography.labelLarge,
        color: colors.textPrimary,
    },
    voteCount: {
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.md,
    },
    voteCountText: {
        ...typography.bodySmall,
        color: colors.textMuted,
        textAlign: 'center',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing.xxl,
    },
    emptyEmoji: {
        fontSize: 64,
        marginBottom: spacing.lg,
    },
    emptyTitle: {
        ...typography.headlineMedium,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    emptyText: {
        ...typography.bodyMedium,
        color: colors.textMuted,
        textAlign: 'center',
    },
});
