import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    ActivityIndicator,
    TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius } from '../theme';
import { supabase } from '../lib/supabase';

interface WeeklyStats {
    totalWorkouts: number;
    pointsEarned: number;
    currentStreak: number;
    longestStreak: number;
    challengesCompleted: number;
    rankChange: number;
    currentRank: number;
    weeklyGoal: number;
    weeklyProgress: number;
}

export default function WeeklySummaryScreen() {
    const navigation = useNavigation();
    const [stats, setStats] = useState<WeeklyStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [weekDates, setWeekDates] = useState<{ start: Date; end: Date } | null>(null);

    useEffect(() => {
        fetchWeeklyStats();
    }, []);

    const getWeekDates = () => {
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - dayOfWeek); // Go to Sunday
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // Go to Saturday
        endOfWeek.setHours(23, 59, 59, 999);

        return { start: startOfWeek, end: endOfWeek };
    };

    const fetchWeeklyStats = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const weekDates = getWeekDates();
            setWeekDates(weekDates);

            // Get user's squad
            const { data: membership } = await supabase
                .from('squad_members')
                .select('squad_id')
                .eq('user_id', user.id)
                .single();

            if (!membership) {
                setStats({
                    totalWorkouts: 0,
                    pointsEarned: 0,
                    currentStreak: 0,
                    longestStreak: 0,
                    challengesCompleted: 0,
                    rankChange: 0,
                    currentRank: 0,
                    weeklyGoal: 5,
                    weeklyProgress: 0,
                });
                return;
            }

            // Get user's profile for streak info
            const { data: profile } = await supabase
                .from('profiles')
                .select('current_streak, longest_streak')
                .eq('id', user.id)
                .single();

            // Get workouts this week
            const { data: weeklyWorkouts } = await supabase
                .from('workouts')
                .select('points, created_at')
                .eq('user_id', user.id)
                .gte('created_at', weekDates.start.toISOString())
                .lte('created_at', weekDates.end.toISOString());

            // Get workouts last week for comparison
            const lastWeekStart = new Date(weekDates.start);
            lastWeekStart.setDate(lastWeekStart.getDate() - 7);
            const lastWeekEnd = new Date(weekDates.end);
            lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);

            const { data: lastWeekWorkouts } = await supabase
                .from('workouts')
                .select('points')
                .eq('user_id', user.id)
                .gte('created_at', lastWeekStart.toISOString())
                .lte('created_at', lastWeekEnd.toISOString());

            // Get completed challenges this week
            const { data: completedChallenges } = await supabase
                .from('challenge_participants')
                .select('challenge_id, completed_at')
                .eq('user_id', user.id)
                .not('completed_at', 'is', null)
                .gte('completed_at', weekDates.start.toISOString())
                .lte('completed_at', weekDates.end.toISOString());

            // Calculate current rank in squad
            const { data: squadWorkouts } = await supabase
                .from('workouts')
                .select('user_id, points')
                .eq('squad_id', membership.squad_id)
                .gte('created_at', weekDates.start.toISOString())
                .lte('created_at', weekDates.end.toISOString());

            // Calculate points by user
            const userPoints: Record<string, number> = {};
            squadWorkouts?.forEach(workout => {
                userPoints[workout.user_id] = (userPoints[workout.user_id] || 0) + workout.points;
            });

            // Sort users by points and find current user's rank
            const sortedUsers = Object.entries(userPoints)
                .sort(([, a], [, b]) => b - a)
                .map(([userId]) => userId);

            const currentRank = sortedUsers.indexOf(user.id) + 1;

            // Calculate last week's rank for comparison
            const { data: lastWeekSquadWorkouts } = await supabase
                .from('workouts')
                .select('user_id, points')
                .eq('squad_id', membership.squad_id)
                .gte('created_at', lastWeekStart.toISOString())
                .lte('created_at', lastWeekEnd.toISOString());

            const lastWeekUserPoints: Record<string, number> = {};
            lastWeekSquadWorkouts?.forEach(workout => {
                lastWeekUserPoints[workout.user_id] = (lastWeekUserPoints[workout.user_id] || 0) + workout.points;
            });

            const lastWeekSortedUsers = Object.entries(lastWeekUserPoints)
                .sort(([, a], [, b]) => b - a)
                .map(([userId]) => userId);

            const lastWeekRank = lastWeekSortedUsers.indexOf(user.id) + 1;
            const rankChange = lastWeekRank > 0 ? lastWeekRank - currentRank : 0;

            // Calculate stats
            const totalWorkouts = weeklyWorkouts?.length || 0;
            const pointsEarned = weeklyWorkouts?.reduce((sum, w) => sum + w.points, 0) || 0;
            const weeklyGoal = 5; // Could be configurable
            const weeklyProgress = Math.min((totalWorkouts / weeklyGoal) * 100, 100);

            setStats({
                totalWorkouts,
                pointsEarned,
                currentStreak: profile?.current_streak || 0,
                longestStreak: profile?.longest_streak || 0,
                challengesCompleted: completedChallenges?.length || 0,
                rankChange,
                currentRank: currentRank || 0,
                weeklyGoal,
                weeklyProgress,
            });

        } catch (error) {
            console.error('Error fetching weekly stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatWeekRange = () => {
        if (!weekDates) return '';
        const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
        return `${weekDates.start.toLocaleDateString('en-US', options)} - ${weekDates.end.toLocaleDateString('en-US', options)}`;
    };

    const getRankChangeIcon = (change: number) => {
        if (change > 0) return '📈';
        if (change < 0) return '📉';
        return '➡️';
    };

    const getRankChangeText = (change: number) => {
        if (change > 0) return `+${change} spots`;
        if (change < 0) return `${change} spots`;
        return 'No change';
    };

    const getRankChangeColor = (change: number) => {
        if (change > 0) return colors.success;
        if (change < 0) return colors.error;
        return colors.textMuted;
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loading}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Loading weekly summary...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!stats) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.error}>
                    <Text style={styles.errorText}>Unable to load weekly summary</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollView}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.backButtonText}>← Back</Text>
                    </TouchableOpacity>
                    <View style={styles.headerContent}>
                        <Text style={styles.title}>Weekly Summary</Text>
                        <Text style={styles.weekRange}>{formatWeekRange()}</Text>
                    </View>
                </View>

                {/* Weekly Goal Progress */}
                <View style={styles.goalCard}>
                    <Text style={styles.goalTitle}>Weekly Goal Progress</Text>
                    <View style={styles.goalProgress}>
                        <View style={styles.goalProgressBar}>
                            <View
                                style={[
                                    styles.goalProgressFill,
                                    { width: `${stats.weeklyProgress}%` }
                                ]}
                            />
                        </View>
                        <Text style={styles.goalProgressText}>
                            {stats.totalWorkouts}/{stats.weeklyGoal} workouts
                        </Text>
                    </View>
                    <Text style={styles.goalPercentage}>
                        {Math.round(stats.weeklyProgress)}% Complete
                    </Text>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <Text style={styles.statIcon}>🏋️</Text>
                        <Text style={styles.statValue}>{stats.totalWorkouts}</Text>
                        <Text style={styles.statLabel}>Workouts</Text>
                    </View>

                    <View style={styles.statCard}>
                        <Text style={styles.statIcon}>⭐</Text>
                        <Text style={styles.statValue}>{stats.pointsEarned}</Text>
                        <Text style={styles.statLabel}>Points</Text>
                    </View>

                    <View style={styles.statCard}>
                        <Text style={styles.statIcon}>🔥</Text>
                        <Text style={styles.statValue}>{stats.currentStreak}</Text>
                        <Text style={styles.statLabel}>Current Streak</Text>
                    </View>

                    <View style={styles.statCard}>
                        <Text style={styles.statIcon}>🏆</Text>
                        <Text style={styles.statValue}>{stats.challengesCompleted}</Text>
                        <Text style={styles.statLabel}>Challenges</Text>
                    </View>
                </View>

                {/* Rank Card */}
                <View style={styles.rankCard}>
                    <View style={styles.rankHeader}>
                        <Text style={styles.rankTitle}>Squad Ranking</Text>
                        <Text style={styles.rankIcon}>👑</Text>
                    </View>
                    <View style={styles.rankContent}>
                        <Text style={styles.rankPosition}>#{stats.currentRank}</Text>
                        <View style={styles.rankChange}>
                            <Text style={styles.rankChangeIcon}>
                                {getRankChangeIcon(stats.rankChange)}
                            </Text>
                            <Text style={[
                                styles.rankChangeText,
                                { color: getRankChangeColor(stats.rankChange) }
                            ]}>
                                {getRankChangeText(stats.rankChange)}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Streak Info */}
                <View style={styles.streakCard}>
                    <Text style={styles.streakTitle}>Streak Status</Text>
                    <View style={styles.streakContent}>
                        <View style={styles.streakItem}>
                            <Text style={styles.streakLabel}>Current</Text>
                            <Text style={styles.streakValue}>{stats.currentStreak} days</Text>
                        </View>
                        <View style={styles.streakDivider} />
                        <View style={styles.streakItem}>
                            <Text style={styles.streakLabel}>Personal Best</Text>
                            <Text style={styles.streakValue}>{stats.longestStreak} days</Text>
                        </View>
                    </View>
                    {stats.currentStreak === stats.longestStreak && stats.currentStreak > 0 && (
                        <Text style={styles.streakRecord}>🎉 New Personal Record!</Text>
                    )}
                </View>

                {/* Motivational Message */}
                <View style={styles.motivationCard}>
                    <Text style={styles.motivationIcon}>💪</Text>
                    <Text style={styles.motivationText}>
                        {stats.weeklyProgress >= 100
                            ? "Incredible work this week! You've crushed your goals!"
                            : stats.weeklyProgress >= 80
                            ? "You're so close to your weekly goal! Keep pushing!"
                            : stats.weeklyProgress >= 50
                            ? "Great progress this week! You're halfway there!"
                            : stats.totalWorkouts > 0
                            ? "Good start! Every workout counts towards your goals."
                            : "Ready to start your week strong? Let's get moving!"}
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
    scrollView: {
        flex: 1,
    },
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        ...typography.bodyMedium,
        color: colors.textMuted,
        marginTop: 12,
    },
    error: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        ...typography.bodyMedium,
        color: colors.error,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        paddingBottom: spacing.md,
    },
    backButton: {
        marginRight: spacing.md,
    },
    backButtonText: {
        ...typography.bodyMedium,
        color: colors.primary,
        fontWeight: '600',
    },
    headerContent: {
        flex: 1,
    },
    title: {
        ...typography.headlineMedium,
        color: colors.textPrimary,
        fontWeight: '700',
    },
    weekRange: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
        marginTop: 2,
    },
    goalCard: {
        backgroundColor: colors.surface,
        margin: spacing.md,
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
    },
    goalTitle: {
        ...typography.bodyLarge,
        color: colors.textPrimary,
        fontWeight: '600',
        marginBottom: spacing.md,
    },
    goalProgress: {
        marginBottom: spacing.sm,
    },
    goalProgressBar: {
        height: 12,
        backgroundColor: colors.border,
        borderRadius: 6,
        overflow: 'hidden',
        marginBottom: spacing.xs,
    },
    goalProgressFill: {
        height: '100%',
        backgroundColor: colors.primary,
        borderRadius: 6,
    },
    goalProgressText: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
    },
    goalPercentage: {
        ...typography.bodyLarge,
        color: colors.primary,
        fontWeight: '600',
        textAlign: 'center',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        margin: spacing.md,
        marginTop: 0,
    },
    statCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        margin: spacing.xs,
        flex: 1,
        minWidth: '45%',
        alignItems: 'center',
    },
    statIcon: {
        fontSize: 32,
        marginBottom: spacing.sm,
    },
    statValue: {
        ...typography.headlineMedium,
        color: colors.primary,
        fontWeight: '700',
        marginBottom: spacing.xs,
    },
    statLabel: {
        ...typography.labelMedium,
        color: colors.textMuted,
        textAlign: 'center',
    },
    rankCard: {
        backgroundColor: colors.surface,
        margin: spacing.md,
        marginTop: 0,
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
    },
    rankHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    rankTitle: {
        ...typography.bodyLarge,
        color: colors.textPrimary,
        fontWeight: '600',
    },
    rankIcon: {
        fontSize: 24,
    },
    rankContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    rankPosition: {
        ...typography.headlineLarge,
        color: colors.primary,
        fontWeight: '700',
    },
    rankChange: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    rankChangeIcon: {
        fontSize: 16,
    },
    rankChangeText: {
        ...typography.bodyMedium,
        fontWeight: '600',
    },
    streakCard: {
        backgroundColor: colors.surface,
        margin: spacing.md,
        marginTop: 0,
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
    },
    streakTitle: {
        ...typography.bodyLarge,
        color: colors.textPrimary,
        fontWeight: '600',
        marginBottom: spacing.md,
    },
    streakContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    streakItem: {
        flex: 1,
        alignItems: 'center',
    },
    streakDivider: {
        width: 1,
        height: 40,
        backgroundColor: colors.border,
        marginHorizontal: spacing.md,
    },
    streakLabel: {
        ...typography.labelMedium,
        color: colors.textMuted,
        marginBottom: spacing.xs,
    },
    streakValue: {
        ...typography.headlineSmall,
        color: colors.primary,
        fontWeight: '700',
    },
    streakRecord: {
        ...typography.bodyMedium,
        color: colors.success,
        textAlign: 'center',
        marginTop: spacing.md,
        fontWeight: '600',
    },
    motivationCard: {
        backgroundColor: colors.surface,
        margin: spacing.md,
        marginTop: 0,
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
    },
    motivationIcon: {
        fontSize: 48,
        marginBottom: spacing.md,
    },
    motivationText: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
});