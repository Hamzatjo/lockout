// LOCKOUT Leaderboard Screen

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { supabase } from '../lib/supabase';

type LeaderboardEntry = {
    user_id: string;
    username: string;
    avatar_url: string | null;
    total_points: number;
    workout_count: number;
};

type TimeFilter = 'week' | 'season' | 'all';

export default function LeaderboardScreen() {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<TimeFilter>('week');
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [squadName, setSquadName] = useState<string | null>(null);

    useEffect(() => {
        fetchLeaderboard();
    }, [filter]);

    const getDateFilter = () => {
        const now = new Date();
        switch (filter) {
            case 'week':
                const weekAgo = new Date(now);
                weekAgo.setDate(weekAgo.getDate() - 7);
                return weekAgo.toISOString();
            case 'season':
                // Season = current month
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                return monthStart.toISOString();
            case 'all':
            default:
                return '2020-01-01T00:00:00Z'; // All time
        }
    };

    const fetchLeaderboard = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setCurrentUserId(user.id);

            // Get user's squad
            const { data: membership } = await supabase
                .from('squad_members')
                .select('squad_id, squads(name)')
                .eq('user_id', user.id)
                .single();

            if (!membership) {
                setLoading(false);
                return;
            }

            setSquadName((membership.squads as any)?.name || null);

            // Get workouts with points in time range
            const dateFilter = getDateFilter();
            const { data: workouts } = await supabase
                .from('workouts')
                .select('user_id, points, profiles(username, avatar_url)')
                .eq('squad_id', membership.squad_id)
                .gte('created_at', dateFilter)
                .gt('points', 0);

            if (!workouts) {
                setLoading(false);
                return;
            }

            // Aggregate by user
            const userStats: Record<string, LeaderboardEntry> = {};

            workouts.forEach((workout: any) => {
                const userId = workout.user_id;
                if (!userStats[userId]) {
                    userStats[userId] = {
                        user_id: userId,
                        username: workout.profiles?.username || 'Unknown',
                        avatar_url: workout.profiles?.avatar_url || null,
                        total_points: 0,
                        workout_count: 0,
                    };
                }
                userStats[userId].total_points += workout.points || 0;
                userStats[userId].workout_count += 1;
            });

            // Sort by points descending
            const sorted = Object.values(userStats).sort(
                (a, b) => b.total_points - a.total_points
            );

            setEntries(sorted);
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchLeaderboard();
    };

    const renderEntry = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
        const rank = index + 1;
        const isCurrentUser = item.user_id === currentUserId;
        const isTop3 = rank <= 3;

        const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;

        return (
            <View style={[
                styles.entryCard,
                isCurrentUser && styles.currentUserCard,
                isTop3 && styles.top3Card,
            ]}>
                {/* Rank */}
                <View style={styles.rankContainer}>
                    {rankEmoji ? (
                        <Text style={styles.rankEmoji}>{rankEmoji}</Text>
                    ) : (
                        <Text style={styles.rankNumber}>{rank}</Text>
                    )}
                </View>

                {/* Avatar */}
                <View style={[styles.avatar, isTop3 && styles.top3Avatar]}>
                    {item.avatar_url ? (
                        <Image source={{ uri: item.avatar_url }} style={styles.avatarImage} />
                    ) : (
                        <Text style={styles.avatarText}>
                            {item.username?.[0]?.toUpperCase() || '?'}
                        </Text>
                    )}
                </View>

                {/* Info */}
                <View style={styles.entryInfo}>
                    <Text style={[styles.entryName, isCurrentUser && styles.currentUserName]}>
                        {item.username} {isCurrentUser && '(You)'}
                    </Text>
                    <Text style={styles.workoutCount}>
                        {item.workout_count} workout{item.workout_count !== 1 ? 's' : ''}
                    </Text>
                </View>

                {/* Points */}
                <View style={styles.pointsContainer}>
                    <Text style={[styles.points, isTop3 && styles.top3Points]}>
                        {item.total_points}
                    </Text>
                    <Text style={styles.pointsLabel}>pts</Text>
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
                <Text style={styles.headerTitle}>LEADERBOARD</Text>
                {squadName && <Text style={styles.squadName}>{squadName}</Text>}
            </View>

            {/* Time Filter */}
            <View style={styles.filterContainer}>
                <TouchableOpacity
                    style={[styles.filterButton, filter === 'week' && styles.filterActive]}
                    onPress={() => setFilter('week')}
                >
                    <Text style={[styles.filterText, filter === 'week' && styles.filterTextActive]}>
                        This Week
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterButton, filter === 'season' && styles.filterActive]}
                    onPress={() => setFilter('season')}
                >
                    <Text style={[styles.filterText, filter === 'season' && styles.filterTextActive]}>
                        This Season
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterButton, filter === 'all' && styles.filterActive]}
                    onPress={() => setFilter('all')}
                >
                    <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
                        All Time
                    </Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={entries}
                renderItem={renderEntry}
                keyExtractor={(item) => item.user_id}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyEmoji}>📊</Text>
                        <Text style={styles.emptyTitle}>No activity yet</Text>
                        <Text style={styles.emptyText}>
                            Complete workouts to climb the leaderboard!
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
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerTitle: {
        ...typography.labelLarge,
        color: colors.primary,
    },
    squadName: {
        ...typography.labelSmall,
        color: colors.textMuted,
        marginTop: spacing.xs,
    },
    filterContainer: {
        flexDirection: 'row',
        padding: spacing.md,
        gap: spacing.sm,
    },
    filterButton: {
        flex: 1,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.full,
        backgroundColor: colors.surface,
        alignItems: 'center',
    },
    filterActive: {
        backgroundColor: colors.primary,
    },
    filterText: {
        ...typography.labelSmall,
        color: colors.textSecondary,
    },
    filterTextActive: {
        color: colors.background,
        fontWeight: '700',
    },
    list: {
        padding: spacing.md,
    },
    entryCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.sm,
    },
    currentUserCard: {
        borderWidth: 2,
        borderColor: colors.primary,
    },
    top3Card: {
        backgroundColor: colors.surfaceLight,
    },
    rankContainer: {
        width: 36,
        alignItems: 'center',
    },
    rankEmoji: {
        fontSize: 24,
    },
    rankNumber: {
        ...typography.headlineMedium,
        color: colors.textMuted,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.surfaceLighter,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: spacing.sm,
    },
    top3Avatar: {
        borderWidth: 2,
        borderColor: colors.primary,
    },
    avatarImage: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    avatarText: {
        ...typography.headlineSmall,
        color: colors.primary,
    },
    entryInfo: {
        flex: 1,
        marginLeft: spacing.md,
    },
    entryName: {
        ...typography.bodyLarge,
        color: colors.textPrimary,
        fontWeight: '600',
    },
    currentUserName: {
        color: colors.primary,
    },
    workoutCount: {
        ...typography.bodySmall,
        color: colors.textMuted,
        marginTop: spacing.xs,
    },
    pointsContainer: {
        alignItems: 'flex-end',
    },
    points: {
        ...typography.statsSmall,
        color: colors.textPrimary,
    },
    top3Points: {
        color: colors.primary,
    },
    pointsLabel: {
        ...typography.labelSmall,
        color: colors.textMuted,
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
