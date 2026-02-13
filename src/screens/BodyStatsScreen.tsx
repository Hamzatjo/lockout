import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
    TouchableOpacity,
    Modal,
    FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '../theme';
import { supabase } from '../lib/supabase';
import BodyVisual from '../components/BodyVisual';
import { MuscleGroup, MUSCLE_GROUP_LABELS, MUSCLE_GROUPS, EXERCISES, Exercise, getExercisesByMuscleGroup } from '../data/exercises';
import { calculate1RM } from './PRLeaderboardScreen';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type MuscleRank = {
    muscleGroup: MuscleGroup;
    rank: number;
    totalMembers: number;
    percentile: number;
    bestExercise: string;
    best1RM: number;
};

type Props = {
    navigation: NativeStackNavigationProp<any>;
};

export default function BodyStatsScreen({ navigation }: Props) {
    const [muscleRanks, setMuscleRanks] = useState<MuscleRank[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [squadName, setSquadName] = useState<string | null>(null);
    const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(null);

    useEffect(() => {
        fetchMuscleRanks();
    }, []);

    const fetchMuscleRanks = async () => {
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

            const { data: memberList } = await supabase
                .from('squad_members')
                .select('user_id')
                .eq('squad_id', membership.squad_id);

            const totalMembers = memberList?.length || 1;

            const { data: workouts } = await supabase
                .from('workouts')
                .select('user_id, exercise_type, weight_kg, reps, is_verified')
                .eq('squad_id', membership.squad_id)
                .not('exercise_type', 'is', null)
                .not('weight_kg', 'is', null)
                .gt('weight_kg', 0)
                .gt('reps', 0);

            if (!workouts) {
                setLoading(false);
                return;
            }

            const muscleGroupData: Record<MuscleGroup, Record<string, { best1RM: number; exercise: string }>> = {} as any;
            
            MUSCLE_GROUPS.forEach(group => {
                muscleGroupData[group] = {};
            });

            workouts.forEach((w: any) => {
                if (!w.exercise_type || !w.weight_kg || !w.reps) return;
                
                const exercise = EXERCISES.find(e => e.id === w.exercise_type);
                if (!exercise) return;

                const estimated1RM = calculate1RM(parseFloat(w.weight_kg), parseInt(w.reps));
                if (estimated1RM <= 0) return;

                const muscleGroup = exercise.muscleGroup;
                
                if (!muscleGroupData[muscleGroup][w.user_id] || 
                    estimated1RM > muscleGroupData[muscleGroup][w.user_id].best1RM) {
                    muscleGroupData[muscleGroup][w.user_id] = {
                        best1RM: estimated1RM,
                        exercise: exercise.name,
                    };
                }
            });

            const ranks: MuscleRank[] = MUSCLE_GROUPS.map(muscleGroup => {
                const userData = muscleGroupData[muscleGroup];
                const sortedUsers = Object.entries(userData)
                    .map(([userId, data]) => ({ userId, ...data }))
                    .sort((a, b) => b.best1RM - a.best1RM);

                const userIndex = sortedUsers.findIndex(u => u.userId === user.id);
                const rank = userIndex >= 0 ? userIndex + 1 : totalMembers;
                const userBest = sortedUsers.find(u => u.userId === user.id);

                return {
                    muscleGroup,
                    rank,
                    totalMembers,
                    percentile: Math.round(((totalMembers - rank) / Math.max(totalMembers - 1, 1)) * 100),
                    bestExercise: userBest?.exercise || '-',
                    best1RM: userBest?.best1RM || 0,
                };
            });

            setMuscleRanks(ranks);
        } catch (error) {
            console.error('Error fetching muscle ranks:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchMuscleRanks();
    };

    const getColorForRank = (rank: number, total: number): string => {
        if (total <= 1) return colors.primary;
        const percentile = ((total - rank) / (total - 1)) * 100;
        if (percentile >= 80) return '#00FF87';
        if (percentile >= 60) return '#7FFF00';
        if (percentile >= 40) return '#FFD700';
        if (percentile >= 20) return '#FFA500';
        return '#FF6B6B';
    };

    const getRankEmoji = (rank: number, total: number): string => {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        if (rank <= Math.ceil(total / 2)) return '💪';
        return '📈';
    };

    const openExercisePicker = (muscleGroup: MuscleGroup) => {
        setSelectedMuscle(muscleGroup);
    };

    const handleExerciseSelect = (exercise: Exercise) => {
        setSelectedMuscle(null);
        navigation.navigate('PRLeaderboard', { exercise });
    };

    const renderExerciseItem = ({ item }: { item: Exercise }) => (
        <TouchableOpacity
            style={styles.exerciseItem}
            onPress={() => handleExerciseSelect(item)}
        >
            <Text style={styles.exerciseItemName}>{item.name}</Text>
            <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
    );

    const selectedExercises = selectedMuscle ? getExercisesByMuscleGroup(selectedMuscle) : [];

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
                    <Text style={styles.headerTitle}>BODY & PRS</Text>
                    <TouchableOpacity 
                        style={styles.statsButton}
                        onPress={() => navigation.navigate('StatsOverview')}
                    >
                        <Text style={styles.statsButtonText}>My Stats →</Text>
                    </TouchableOpacity>
                </View>
                {squadName && <Text style={styles.squadName}>{squadName}</Text>}
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
                <View style={styles.bodyContainer}>
                    <BodyVisual 
                        muscleRanks={muscleRanks} 
                        size={260}
                        onMusclePress={openExercisePicker}
                    />
                </View>

                <Text style={styles.sectionTitle}>Muscle Group Rankings</Text>

                {muscleRanks.map((mr) => (
                    <TouchableOpacity
                        key={mr.muscleGroup}
                        style={styles.rankCard}
                        onPress={() => openExercisePicker(mr.muscleGroup)}
                    >
                        <View style={styles.rankHeader}>
                            <Text style={styles.rankEmoji}>{getRankEmoji(mr.rank, mr.totalMembers)}</Text>
                            <View style={styles.rankInfo}>
                                <Text style={styles.muscleName}>{MUSCLE_GROUP_LABELS[mr.muscleGroup]}</Text>
                                <Text style={styles.bestExercise}>Best: {mr.bestExercise}</Text>
                            </View>
                            <View style={[styles.rankBadge, { backgroundColor: getColorForRank(mr.rank, mr.totalMembers) }]}>
                                <Text style={styles.rankBadgeText}>#{mr.rank}</Text>
                                <Text style={styles.rankBadgeSub}>of {mr.totalMembers}</Text>
                            </View>
                        </View>
                        {mr.best1RM > 0 && (
                            <View style={styles.rankStats}>
                                <Text style={styles.statLabel}>Best 1RM:</Text>
                                <Text style={styles.statValue}>{mr.best1RM} kg</Text>
                                <View style={styles.percentileBar}>
                                    <View 
                                        style={[
                                            styles.percentileFill, 
                                            { width: `${mr.percentile}%`, backgroundColor: getColorForRank(mr.rank, mr.totalMembers) }
                                        ]} 
                                    />
                                </View>
                                <Text style={styles.percentileText}>{mr.percentile}%</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <Modal
                visible={!!selectedMuscle}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setSelectedMuscle(null)}
            >
                <SafeAreaView style={styles.modalContainer} edges={['top']}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setSelectedMuscle(null)}>
                            <Text style={styles.closeButton}>✕</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>
                            {selectedMuscle ? MUSCLE_GROUP_LABELS[selectedMuscle] : ''} Exercises
                        </Text>
                        <View style={styles.placeholder} />
                    </View>
                    <FlatList
                        data={selectedExercises}
                        renderItem={renderExerciseItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.exerciseList}
                    />
                </SafeAreaView>
            </Modal>
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
    statsButton: {
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.md,
    },
    statsButtonText: {
        ...typography.labelSmall,
        color: colors.primary,
    },
    squadName: {
        ...typography.labelSmall,
        color: colors.textMuted,
        marginTop: spacing.xs,
    },
    content: {
        padding: spacing.md,
    },
    bodyContainer: {
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    legend: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: spacing.lg,
        gap: spacing.sm,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    legendColor: {
        width: 12,
        height: 12,
        borderRadius: 2,
        marginRight: spacing.xs,
    },
    legendText: {
        ...typography.labelSmall,
        color: colors.textMuted,
    },
    sectionTitle: {
        ...typography.headlineSmall,
        color: colors.textPrimary,
        marginBottom: spacing.md,
    },
    rankCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    rankHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rankEmoji: {
        fontSize: 28,
        marginRight: spacing.md,
    },
    rankInfo: {
        flex: 1,
    },
    muscleName: {
        ...typography.bodyLarge,
        color: colors.textPrimary,
        fontWeight: '600',
    },
    bestExercise: {
        ...typography.bodySmall,
        color: colors.textMuted,
        marginTop: 2,
    },
    rankBadge: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    rankBadgeText: {
        ...typography.headlineSmall,
        color: colors.background,
        fontWeight: '700',
    },
    rankBadgeSub: {
        ...typography.labelSmall,
        color: colors.background,
        opacity: 0.8,
    },
    rankStats: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.md,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    statLabel: {
        ...typography.bodySmall,
        color: colors.textMuted,
    },
    statValue: {
        ...typography.bodyLarge,
        color: colors.primary,
        fontWeight: '600',
        marginLeft: spacing.xs,
    },
    percentileBar: {
        flex: 1,
        height: 6,
        backgroundColor: colors.surfaceLight,
        borderRadius: 3,
        marginHorizontal: spacing.md,
        overflow: 'hidden',
    },
    percentileFill: {
        height: '100%',
        borderRadius: 3,
    },
    percentileText: {
        ...typography.labelSmall,
        color: colors.textMuted,
        width: 40,
        textAlign: 'right',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: colors.background,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    closeButton: {
        fontSize: 24,
        color: colors.textPrimary,
    },
    modalTitle: {
        ...typography.labelLarge,
        color: colors.primary,
    },
    placeholder: {
        width: 24,
    },
    exerciseList: {
        padding: spacing.md,
    },
    exerciseItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.sm,
    },
    exerciseItemName: {
        ...typography.bodyMedium,
        color: colors.textPrimary,
        flex: 1,
    },
    chevron: {
        fontSize: 20,
        color: colors.textMuted,
    },
});
