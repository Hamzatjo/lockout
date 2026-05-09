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
import { colors, typography, spacing, borderRadius } from '../theme';
import { supabase } from '../lib/supabase';
import { StreakBadge } from '../components/StreakBadge';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type LeaderboardEntry = {
    user_id: string;
    username: string;
    avatar_url: string | null;
    total_points: number;
    check_in_days: number;
    tribunal_wins: number;
    pr_claims: number;
    current_streak: number;
};

type TimeFilter = 'week' | 'season' | 'all';

type Props = {
    navigation: NativeStackNavigationProp<any>;
};

export default function LeaderboardScreen({ navigation }: Props) {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<TimeFilter>('week');
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [squadName, setSquadName] = useState<string | null>(null);

    useEffect(() => {
        fetchLeaderboard();
    }, [filter]);

    const getDateRange = () => {
        const now = new Date();
        switch (filter) {
            case 'week':
                const weekAgo = new Date(now);
                weekAgo.setDate(weekAgo.getDate() - 7);
                weekAgo.setHours(0, 0, 0, 0);
                return { start: weekAgo.toISOString(), end: now.toISOString() };
            case 'season':
                const seasonStart = new Date(now.getFullYear(), now.getMonth(), 1);
                return { start: seasonStart.toISOString(), end: now.toISOString() };
            case 'all':
            default:
                return { start: '2020-01-01T00:00:00Z', end: now.toISOString() };
        }
    };

    const fetchLeaderboard = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setCurrentUserId(user.id);

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

            const { start, end } = getDateRange();

            const { data: workouts } = await supabase
                .from('workouts')
                .select('user_id, points, verification_level, created_at, profiles(username, avatar_url, current_streak)')
                .eq('squad_id', membership.squad_id)
                .gte('created_at', start)
                .lte('created_at', end)
                .gt('points', 0);

            if (!workouts) {
                setLoading(false);
                return;
            }

            const userStats: Record<string, LeaderboardEntry & { checkInDates: Set<string> }> = {};

            workouts.forEach((workout: any) => {
                const userId = workout.user_id;
                if (!userStats[userId]) {
                    userStats[userId] = {
                        user_id: userId,
                        username: workout.profiles?.username || 'Unknown',
                        avatar_url: workout.profiles?.avatar_url || null,
                        current_streak: workout.profiles?.current_streak || 0,
                        total_points: 0,
                        check_in_days: 0,
                        tribunal_wins: 0,
                        pr_claims: 0,
                        checkInDates: new Set(),
                    };
                }

                userStats[userId].total_points += workout.points || 0;

                if (workout.verification_level === 'check_in') {
                    const dateKey = new Date(workout.created_at).toDateString();
                    if (!userStats[userId].checkInDates.has(dateKey)) {
                        userStats[userId].checkInDates.add(dateKey);
                        userStats[userId].check_in_days += 1;
                    }
                }

                if (workout.verification_level === 'tribunal') {
                    userStats[userId].tribunal_wins += 1;
                }
            });

            const sorted = Object.values(userStats)
                .map(({ checkInDates, ...entry }) => entry)
                .sort((a, b) => b.total_points - a.total_points);

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
                <View style={styles.rankContainer}>
                    {rankEmoji ? (
                        <Text style={styles.rankEmoji}>{rankEmoji}</Text>
                    ) : (
                        <Text style={styles.rankNumber}>{rank}</Text>
                    )}
                </View>

                <View style={[styles.avatar, isTop3 && styles.top3Avatar]}>
                    {item.avatar_url ? (
                        <Image source={{ uri: item.avatar_url }} style={styles.avatarImage} />
                    ) : (
                        <Text style={styles.avatarText}>
                            {item.username?.[0]?.toUpperCase() || '?'}
                        </Text>
                    )}
                </View>

                <View style={styles.entryInfo}>
                    <View style={styles.nameRow}>
                        <Text style={[styles.entryName, isCurrentUser && styles.currentUserName]}>
                            {item.username} {isCurrentUser && '(You)'}
                        </Text>
                        <StreakBadge streak={item.current_streak} mode="compact" />
                    </View>
                    <View style={styles.statsRow}>
                        <Text style={styles.statItem}>📅 {item.check_in_days} days</Text>
                        <Text style={styles.statItem}>⚖️ {item.tribunal_wins}</Text>
                    </View>
                </View>

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
                <View style={styles.headerRow}>
                    <Text style={styles.headerTitle}>LEADERBOARD</Text>
                    <TouchableOpacity 
                        style={styles.bodyButton}
                        onPress={() => navigation.navigate('BodyStats')}
                    >
                        <Text style={styles.bodyButtonText}>Body →</Text>
                    </TouchableOpacity>
                </View>
                {squadName && <Text style={styles.squadName}>{squadName}</Text>}
            </View>

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

            <View style={styles.scoringInfo}>
                <Text style={styles.scoringText}>
                    📸 Check-in: 1 pt/day • ⚖️ Tribunal: 10-15 pts • 🏆 Verified PR: Bonus
                </Text>
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
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        ...typography.labelLarge,
        color: colors.primary,
    },
    bodyButton: {
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.md,
    },
    bodyButtonText: {
        ...typography.labelSmall,
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
    scoringInfo: {
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.sm,
    },
    scoringText: {
        ...typography.labelSmall,
        color: colors.textMuted,
        textAlign: 'center',
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
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.xs,
    },
    entryName: {
        ...typography.bodyLarge,
        color: colors.textPrimary,
        fontWeight: '600',
        flex: 1,
    },
    currentUserName: {
        color: colors.primary,
    },
    statsRow: {
        flexDirection: 'row',
        marginTop: spacing.xs,
        gap: spacing.md,
    },
    statItem: {
        ...typography.labelSmall,
        color: colors.textMuted,
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
