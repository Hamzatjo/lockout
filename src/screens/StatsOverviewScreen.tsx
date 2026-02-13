import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '../theme';
import { supabase } from '../lib/supabase';
import { MuscleGroup, MUSCLE_GROUP_LABELS, MUSCLE_GROUPS, EXERCISES } from '../data/exercises';
import { calculate1RM } from './PRLeaderboardScreen';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type MuscleScore = {
    muscleGroup: MuscleGroup;
    total1RM: number;
    exerciseCount: number;
    best1RM: number;
    bestExercise: string;
};

type UserStats = {
    totalPoints: number;
    checkInStreak: number;
    totalCheckIns: number;
    tribunalWins: number;
    verifiedPRs: number;
    muscleScores: MuscleScore[];
    overallRank: number;
    squadSize: number;
};

type Props = {
    navigation: NativeStackNavigationProp<any>;
};

export default function StatsOverviewScreen({ navigation }: Props) {
    const [stats, setStats] = useState<UserStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [squadName, setSquadName] = useState<string | null>(null);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

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

            const { data: memberList } = await supabase
                .from('squad_members')
                .select('user_id')
                .eq('squad_id', membership.squad_id);

            const squadSize = memberList?.length || 1;

            const { data: userWorkouts } = await supabase
                .from('workouts')
                .select('*')
                .eq('user_id', user.id)
                .eq('squad_id', membership.squad_id);

            let totalPoints = 0;
            let totalCheckIns = 0;
            let tribunalWins = 0;
            let verifiedPRs = 0;
            const checkInDates = new Set<string>();

            const muscleData: Record<MuscleGroup, { total1RM: number; count: number; best1RM: number; bestExercise: string }> = {} as any;
            MUSCLE_GROUPS.forEach(g => {
                muscleData[g] = { total1RM: 0, count: 0, best1RM: 0, bestExercise: '-' };
            });

            if (userWorkouts) {
                userWorkouts.forEach((w: any) => {
                    totalPoints += w.points || 0;

                    if (w.verification_level === 'check_in' && w.points > 0) {
                        const dateKey = new Date(w.created_at).toDateString();
                        if (!checkInDates.has(dateKey)) {
                            checkInDates.add(dateKey);
                            totalCheckIns += 1;
                        }
                    }

                    if (w.verification_level === 'tribunal' && w.points > 0) {
                        tribunalWins += 1;
                    }

                    if (w.is_verified && w.exercise_type) {
                        verifiedPRs += 1;
                    }

                    if (w.exercise_type && w.weight_kg && w.reps) {
                        const exercise = EXERCISES.find(e => e.id === w.exercise_type);
                        if (exercise) {
                            const estimated1RM = calculate1RM(parseFloat(w.weight_kg), parseInt(w.reps));
                            if (estimated1RM > 0) {
                                const mg = exercise.muscleGroup;
                                muscleData[mg].total1RM += estimated1RM;
                                muscleData[mg].count += 1;
                                if (estimated1RM > muscleData[mg].best1RM) {
                                    muscleData[mg].best1RM = estimated1RM;
                                    muscleData[mg].bestExercise = exercise.name;
                                }
                            }
                        }
                    }
                });
            }

            const { data: allWorkouts } = await supabase
                .from('workouts')
                .select('user_id, points')
                .eq('squad_id', membership.squad_id)
                .gt('points', 0);

            const userTotals: Record<string, number> = {};
            if (allWorkouts) {
                allWorkouts.forEach((w: any) => {
                    userTotals[w.user_id] = (userTotals[w.user_id] || 0) + w.points;
                });
            }

            const sortedUsers = Object.entries(userTotals)
                .sort(([, a], [, b]) => b - a);
            const overallRank = sortedUsers.findIndex(([uid]) => uid === user.id) + 1 || squadSize;

            const muscleScores: MuscleScore[] = MUSCLE_GROUPS.map(mg => ({
                muscleGroup: mg,
                total1RM: muscleData[mg].total1RM,
                exerciseCount: muscleData[mg].count,
                best1RM: muscleData[mg].best1RM,
                bestExercise: muscleData[mg].bestExercise,
            }));

            setStats({
                totalPoints,
                checkInStreak: calculateStreak(Array.from(checkInDates)),
                totalCheckIns,
                tribunalWins,
                verifiedPRs,
                muscleScores,
                overallRank,
                squadSize,
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const calculateStreak = (dates: string[]): number => {
        if (dates.length === 0) return 0;
        
        const sortedDates = dates
            .map(d => new Date(d))
            .sort((a, b) => b.getTime() - a.getTime());

        let streak = 1;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const firstDate = sortedDates[0];
        firstDate.setHours(0, 0, 0, 0);
        
        const dayDiff = Math.floor((today.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
        if (dayDiff > 1) return 0;

        for (let i = 1; i < sortedDates.length; i++) {
            const prev = sortedDates[i - 1];
            const curr = sortedDates[i];
            curr.setHours(0, 0, 0, 0);
            
            const diff = Math.floor((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24));
            if (diff === 1) {
                streak++;
            } else {
                break;
            }
        }

        return streak;
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchStats();
    };

    const getScoreColor = (value: number, max: number): string => {
        const ratio = max > 0 ? value / max : 0;
        if (ratio >= 0.8) return '#00FF87';
        if (ratio >= 0.6) return '#7FFF00';
        if (ratio >= 0.4) return '#FFD700';
        return '#FF6B6B';
    };

    const maxMuscleScore = Math.max(...(stats?.muscleScores.map(m => m.total1RM) || [1]));

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!stats) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text style={styles.backButton}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>MY STATS</Text>
                    <View style={styles.placeholder} />
                </View>
                <View style={styles.emptyState}>
                    <Text style={styles.emptyEmoji}>📊</Text>
                    <Text style={styles.emptyTitle}>No stats yet</Text>
                    <Text style={styles.emptyText}>Start working out to see your stats!</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backButton}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>MY STATS</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                    />
                }
            >
                <View style={styles.overallCard}>
                    <View style={styles.overallHeader}>
                        <Text style={styles.overallLabel}>OVERALL RANK</Text>
                        <View style={styles.rankBadge}>
                            <Text style={styles.rankNumber}>#{stats.overallRank}</Text>
                            <Text style={styles.rankTotal}>/ {stats.squadSize}</Text>
                        </View>
                    </View>
                    <Text style={styles.totalPoints}>{stats.totalPoints}</Text>
                    <Text style={styles.pointsLabel}>Total Points</Text>
                </View>

                <View style={styles.quickStats}>
                    <View style={styles.quickStat}>
                        <Text style={styles.quickStatValue}>🔥 {stats.checkInStreak}</Text>
                        <Text style={styles.quickStatLabel}>Day Streak</Text>
                    </View>
                    <View style={styles.quickStat}>
                        <Text style={styles.quickStatValue}>📅 {stats.totalCheckIns}</Text>
                        <Text style={styles.quickStatLabel}>Check-ins</Text>
                    </View>
                    <View style={styles.quickStat}>
                        <Text style={styles.quickStatValue}>⚖️ {stats.tribunalWins}</Text>
                        <Text style={styles.quickStatLabel}>Tribunals</Text>
                    </View>
                    <View style={styles.quickStat}>
                        <Text style={styles.quickStatValue}>🏆 {stats.verifiedPRs}</Text>
                        <Text style={styles.quickStatLabel}>Verified PRs</Text>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Muscle Group Strength</Text>
                <Text style={styles.sectionSubtitle}>Total estimated 1RM across exercises</Text>

                {stats.muscleScores.map((ms) => (
                    <TouchableOpacity
                        key={ms.muscleGroup}
                        style={styles.muscleCard}
                        onPress={() => navigation.navigate('BodyStats')}
                    >
                        <View style={styles.muscleHeader}>
                            <Text style={styles.muscleName}>{MUSCLE_GROUP_LABELS[ms.muscleGroup]}</Text>
                            <Text style={styles.muscleExercises}>
                                {ms.exerciseCount} exercise{ms.exerciseCount !== 1 ? 's' : ''}
                            </Text>
                        </View>
                        
                        <View style={styles.muscleBar}>
                            <View 
                                style={[
                                    styles.muscleBarFill,
                                    { 
                                        width: `${maxMuscleScore > 0 ? (ms.total1RM / maxMuscleScore) * 100 : 0}%`,
                                        backgroundColor: getScoreColor(ms.total1RM, maxMuscleScore),
                                    }
                                ]} 
                            />
                        </View>
                        
                        <View style={styles.muscleFooter}>
                            <Text style={[styles.muscleTotal, { color: getScoreColor(ms.total1RM, maxMuscleScore) }]}>
                                {ms.total1RM > 0 ? `${ms.total1RM} kg` : '-'}
                            </Text>
                            {ms.best1RM > 0 && (
                                <Text style={styles.muscleBest}>
                                    Best: {ms.best1RM} kg ({ms.bestExercise})
                                </Text>
                            )}
                        </View>
                    </TouchableOpacity>
                ))}

                <TouchableOpacity 
                    style={styles.viewBodyButton}
                    onPress={() => navigation.navigate('BodyStats')}
                >
                    <Text style={styles.viewBodyText}>View Body Visual →</Text>
                </TouchableOpacity>
            </ScrollView>
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
        color: colors.primary,
    },
    placeholder: {
        width: 50,
    },
    content: {
        padding: spacing.md,
    },
    overallCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    overallHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        marginBottom: spacing.md,
    },
    overallLabel: {
        ...typography.labelSmall,
        color: colors.textMuted,
    },
    rankBadge: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    rankNumber: {
        ...typography.headlineLarge,
        color: colors.primary,
        fontWeight: '700',
    },
    rankTotal: {
        ...typography.bodyMedium,
        color: colors.textMuted,
    },
    totalPoints: {
        ...typography.displayLarge,
        color: colors.textPrimary,
        fontWeight: '700',
    },
    pointsLabel: {
        ...typography.labelMedium,
        color: colors.textMuted,
        marginTop: spacing.xs,
    },
    quickStats: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    quickStat: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        alignItems: 'center',
    },
    quickStatValue: {
        ...typography.headlineSmall,
        color: colors.textPrimary,
    },
    quickStatLabel: {
        ...typography.labelSmall,
        color: colors.textMuted,
        marginTop: spacing.xs,
    },
    sectionTitle: {
        ...typography.headlineSmall,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    sectionSubtitle: {
        ...typography.bodySmall,
        color: colors.textMuted,
        marginBottom: spacing.md,
    },
    muscleCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    muscleHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    muscleName: {
        ...typography.bodyLarge,
        color: colors.textPrimary,
        fontWeight: '600',
    },
    muscleExercises: {
        ...typography.labelSmall,
        color: colors.textMuted,
    },
    muscleBar: {
        height: 8,
        backgroundColor: colors.surfaceLight,
        borderRadius: 4,
        overflow: 'hidden',
    },
    muscleBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    muscleFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: spacing.sm,
    },
    muscleTotal: {
        ...typography.headlineSmall,
        fontWeight: '700',
    },
    muscleBest: {
        ...typography.labelSmall,
        color: colors.textMuted,
    },
    viewBodyButton: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.md,
        padding: spacing.lg,
        alignItems: 'center',
        marginTop: spacing.md,
    },
    viewBodyText: {
        ...typography.labelLarge,
        color: colors.background,
        fontWeight: '700',
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
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
