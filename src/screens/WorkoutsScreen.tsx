import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '../theme';
import { supabase, Database } from '../lib/supabase';
import { EXERCISES, getExerciseName } from '../data/exercises';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type WorkoutExercise = Database['public']['Tables']['workout_exercises']['Row'];

type CustomWorkout = Database['public']['Tables']['custom_workouts']['Row'] & {
    exercises: WorkoutExercise[];
    last_logged: string | null;
    log_count: number;
};

type Props = {
    navigation: NativeStackNavigationProp<any>;
};

export default function WorkoutsScreen({ navigation }: Props) {
    const [workouts, setWorkouts] = useState<CustomWorkout[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchWorkouts();
    }, []);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            fetchWorkouts();
        });
        return unsubscribe;
    }, [navigation]);

    const fetchWorkouts = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: workoutsData } = await supabase
                .from('custom_workouts')
                .select(`
                    *,
                    workout_exercises (*)
                `)
                .eq('user_id', user.id)
                .order('updated_at', { ascending: false });

            if (!workoutsData) {
                setLoading(false);
                return;
            }

            const { data: logs } = await supabase
                .from('workout_logs')
                .select('workout_id, logged_at')
                .eq('user_id', user.id)
                .not('workout_id', 'is', null);

            const logCounts: Record<string, number> = {};
            const lastLogged: Record<string, string> = {};

            logs?.forEach((log: any) => {
                if (log.workout_id) {
                    logCounts[log.workout_id] = (logCounts[log.workout_id] || 0) + 1;
                    if (!lastLogged[log.workout_id] || log.logged_at > lastLogged[log.workout_id]) {
                        lastLogged[log.workout_id] = log.logged_at;
                    }
                }
            });

            const processed: CustomWorkout[] = workoutsData.map((w: any) => ({
                ...w,
                exercises: w.workout_exercises?.sort((a: any, b: any) => a.order_index - b.order_index) || [],
                last_logged: lastLogged[w.id] || null,
                log_count: logCounts[w.id] || 0,
            }));

            setWorkouts(processed);
        } catch (error) {
            console.error('Error fetching workouts:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchWorkouts();
    };

    const deleteWorkout = async (workoutId: string) => {
        try {
            const { error } = await supabase
                .from('custom_workouts')
                .delete()
                .eq('id', workoutId);

            if (error) throw error;
            fetchWorkouts();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete workout');
        }
    };

    const handleDelete = (workout: CustomWorkout) => {
        Alert.alert(
            'Delete Workout',
            `Are you sure you want to delete "${workout.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteWorkout(workout.id) },
            ]
        );
    };

    const formatLastLogged = (dateStr: string | null): string => {
        if (!dateStr) return 'Never';
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString();
    };

    const renderWorkout = ({ item }: { item: CustomWorkout }) => {
        const exercisePreview = item.exercises
            .slice(0, 3)
            .map(e => getExerciseName(e.exercise_type))
            .join(', ');
        const moreCount = item.exercises.length - 3;

        return (
            <TouchableOpacity
                style={styles.workoutCard}
                onLongPress={() => handleDelete(item)}
            >
                <View style={styles.workoutHeader}>
                    <View style={styles.workoutInfo}>
                        <Text style={styles.workoutName}>{item.name}</Text>
                        <Text style={styles.workoutMeta}>
                            {item.exercises.length} exercises • {formatLastLogged(item.last_logged)}
                        </Text>
                    </View>
                    <View style={styles.logBadge}>
                        <Text style={styles.logCount}>{item.log_count}</Text>
                        <Text style={styles.logLabel}>logs</Text>
                    </View>
                </View>

                <Text style={styles.exercisePreview} numberOfLines={1}>
                    {exercisePreview}
                    {moreCount > 0 && ` +${moreCount} more`}
                </Text>

                <View style={styles.workoutActions}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => navigation.navigate('EditWorkout', { workout: item })}
                    >
                        <Text style={styles.actionEditText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.startButton}
                        onPress={() => navigation.navigate('ActiveWorkout', { workout: item })}
                    >
                        <Text style={styles.startButtonIcon}>▶</Text>
                        <Text style={styles.startButtonText}>START</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
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
                <Text style={styles.headerTitle}>MY WORKOUTS</Text>
                <View style={styles.headerButtons}>
                    <TouchableOpacity
                        style={styles.quickStartButton}
                        onPress={() => navigation.navigate('ActiveWorkout', {})}
                    >
                        <Text style={styles.quickStartButtonText}>▶ Quick</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => navigation.navigate('EditWorkout', { workout: null })}
                    >
                        <Text style={styles.addButtonText}>+ New</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={workouts}
                renderItem={renderWorkout}
                keyExtractor={(item) => item.id}
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
                        <Text style={styles.emptyEmoji}>🏋️</Text>
                        <Text style={styles.emptyTitle}>No workouts yet</Text>
                        <Text style={styles.emptyText}>
                            Create a workout template to quickly log your sessions!
                        </Text>
                        <TouchableOpacity
                            style={styles.emptyButton}
                            onPress={() => navigation.navigate('EditWorkout', { workout: null })}
                        >
                            <Text style={styles.emptyButtonText}>Create Workout</Text>
                        </TouchableOpacity>
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
    headerTitle: {
        ...typography.labelLarge,
        color: colors.primary,
    },
    addButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
    },
    addButtonText: {
        ...typography.labelSmall,
        color: colors.background,
        fontWeight: '700',
    },
    list: {
        padding: spacing.md,
    },
    workoutCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    workoutHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    workoutInfo: {
        flex: 1,
    },
    workoutName: {
        ...typography.headlineSmall,
        color: colors.textPrimary,
    },
    workoutMeta: {
        ...typography.bodySmall,
        color: colors.textMuted,
        marginTop: spacing.xs,
    },
    logBadge: {
        backgroundColor: colors.surfaceLight,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    logCount: {
        ...typography.headlineSmall,
        color: colors.primary,
    },
    logLabel: {
        ...typography.labelSmall,
        color: colors.textMuted,
    },
    exercisePreview: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginTop: spacing.sm,
    },
    workoutActions: {
        flexDirection: 'row',
        marginTop: spacing.md,
        gap: spacing.sm,
    },
    actionButton: {
        flex: 1,
        backgroundColor: colors.surfaceLight,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    actionEditText: {
        ...typography.labelSmall,
        color: colors.textPrimary,
    },
    startButton: {
        flex: 2,
        backgroundColor: colors.success,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        padding: spacing.md,
        borderRadius: borderRadius.md,
    },
    startButtonIcon: {
        fontSize: 14,
        color: colors.background,
    },
    startButtonText: {
        ...typography.labelSmall,
        color: colors.background,
        fontWeight: '700',
    },
    headerButtons: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    quickStartButton: {
        backgroundColor: colors.success,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
    },
    quickStartButtonText: {
        ...typography.labelSmall,
        color: colors.background,
        fontWeight: '700',
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
        marginBottom: spacing.lg,
    },
    emptyButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
    },
    emptyButtonText: {
        ...typography.labelMedium,
        color: colors.background,
        fontWeight: '700',
    },
});
