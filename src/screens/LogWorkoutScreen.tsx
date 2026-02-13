import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '../theme';
import { supabase } from '../lib/supabase';
import { getExerciseName, Exercise, EXERCISES } from '../data/exercises';
import ExercisePicker from '../components/ExercisePicker';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type SetLog = {
    setNumber: number;
    weight: string;
    reps: string;
    completed: boolean;
};

type ExerciseLogItem = {
    tempId: string;
    exerciseType: string;
    exerciseName: string;
    sets: SetLog[];
};

type Props = {
    navigation: NativeStackNavigationProp<any>;
    route: { params?: { workout?: any } };
};

export default function LogWorkoutScreen({ navigation, route }: Props) {
    const template = route.params?.workout;
    const isQuickLog = !template;

    const [exerciseLogs, setExerciseLogs] = useState<ExerciseLogItem[]>([]);
    const [duration, setDuration] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [showExercisePicker, setShowExercisePicker] = useState(false);
    const [startTime] = useState(Date.now());

    useEffect(() => {
        if (template?.exercises) {
            const logs: ExerciseLogItem[] = template.exercises.map((e: any, idx: number) => ({
                tempId: `template-${idx}`,
                exerciseType: e.exercise_type,
                exerciseName: getExerciseName(e.exercise_type),
                sets: Array.from({ length: e.sets }, (_, i) => ({
                    setNumber: i + 1,
                    weight: '',
                    reps: e.reps_min ? e.reps_min.toString() : '',
                    completed: false,
                })),
            }));
            setExerciseLogs(logs);
        }
    }, [template]);

    const addQuickExercise = (exercise: Exercise) => {
        const newLog: ExerciseLogItem = {
            tempId: `quick-${Date.now()}`,
            exerciseType: exercise.id,
            exerciseName: exercise.name,
            sets: [
                { setNumber: 1, weight: '', reps: '', completed: false },
                { setNumber: 2, weight: '', reps: '', completed: false },
                { setNumber: 3, weight: '', reps: '', completed: false },
            ],
        };
        setExerciseLogs([...exerciseLogs, newLog]);
        setShowExercisePicker(false);
    };

    const removeExercise = (tempId: string) => {
        setExerciseLogs(exerciseLogs.filter(e => e.tempId !== tempId));
    };

    const addSet = (tempId: string) => {
        setExerciseLogs(exerciseLogs.map(e => {
            if (e.tempId === tempId) {
                const newSetNumber = e.sets.length + 1;
                return {
                    ...e,
                    sets: [...e.sets, { setNumber: newSetNumber, weight: '', reps: '', completed: false }],
                };
            }
            return e;
        }));
    };

    const removeSet = (tempId: string, setNumber: number) => {
        setExerciseLogs(exerciseLogs.map(e => {
            if (e.tempId === tempId && e.sets.length > 1) {
                return {
                    ...e,
                    sets: e.sets.filter(s => s.setNumber !== setNumber),
                };
            }
            return e;
        }));
    };

    const updateSet = (tempId: string, setNumber: number, field: 'weight' | 'reps' | 'completed', value: string | boolean) => {
        setExerciseLogs(exerciseLogs.map(e => {
            if (e.tempId === tempId) {
                return {
                    ...e,
                    sets: e.sets.map(s => 
                        s.setNumber === setNumber ? { ...s, [field]: value } : s
                    ),
                };
            }
            return e;
        }));
    };

    const toggleSetComplete = (tempId: string, setNumber: number) => {
        setExerciseLogs(exerciseLogs.map(e => {
            if (e.tempId === tempId) {
                return {
                    ...e,
                    sets: e.sets.map(s => 
                        s.setNumber === setNumber ? { ...s, completed: !s.completed } : s
                    ),
                };
            }
            return e;
        }));
    };

    const getCompletedSets = (sets: SetLog[]) => {
        return sets.filter(s => s.completed).length;
    };

    const saveWorkoutLog = async () => {
        if (exerciseLogs.length === 0) {
            Alert.alert('No Exercises', 'Add at least one exercise to log');
            return;
        }

        const hasAnyData = exerciseLogs.some(e => 
            e.sets.some(s => s.weight || s.reps)
        );

        if (!hasAnyData) {
            Alert.alert('No Data', 'Enter weight or reps for at least one set');
            return;
        }

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data: workoutLog, error: logError } = await supabase
                .from('workout_logs')
                .insert({
                    user_id: user.id,
                    workout_id: template?.id || null,
                    duration_minutes: duration ? parseInt(duration) : null,
                    notes: notes.trim() || null,
                    completed: true,
                })
                .select('id')
                .single();

            if (logError) throw logError;

            const exerciseLogData: Array<{
                workout_log_id: string;
                exercise_type: string;
                set_number: number;
                weight_kg: number | null;
                reps: number | null;
            }> = [];

            exerciseLogs.forEach(e => {
                e.sets.forEach(s => {
                    if (s.weight || s.reps) {
                        exerciseLogData.push({
                            workout_log_id: workoutLog.id,
                            exercise_type: e.exerciseType,
                            set_number: s.setNumber,
                            weight_kg: s.weight ? parseFloat(s.weight) : null,
                            reps: s.reps ? parseInt(s.reps) : null,
                        });
                    }
                });
            });

            const { error: exerciseLogError } = await supabase
                .from('exercise_logs')
                .insert(exerciseLogData);

            if (exerciseLogError) throw exerciseLogError;

            Alert.alert(
                'Workout Logged!',
                isQuickLog 
                    ? 'Your workout has been saved.'
                    : `"${template.name}" has been logged.`,
                [{ text: 'Done', onPress: () => navigation.goBack() }]
            );
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to save workout log');
        } finally {
            setLoading(false);
        }
    };

    const formatDuration = () => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const [elapsedTime, setElapsedTime] = useState(formatDuration());

    useEffect(() => {
        const interval = setInterval(() => {
            setElapsedTime(formatDuration());
        }, 1000);
        return () => clearInterval(interval);
    }, [startTime]);

    const renderSetRow = (exercise: ExerciseLogItem, set: SetLog) => (
        <View key={`${exercise.tempId}-${set.setNumber}`} style={styles.setRow}>
            <Text style={styles.setNumber}>{set.setNumber}</Text>
            <TextInput
                style={[styles.setInput, set.completed && styles.setInputCompleted]}
                placeholder="kg"
                placeholderTextColor={colors.textMuted}
                value={set.weight}
                onChangeText={(v) => updateSet(exercise.tempId, set.setNumber, 'weight', v)}
                keyboardType="decimal-pad"
                editable={!set.completed}
            />
            <Text style={styles.setDivider}>×</Text>
            <TextInput
                style={[styles.setInput, set.completed && styles.setInputCompleted]}
                placeholder="reps"
                placeholderTextColor={colors.textMuted}
                value={set.reps}
                onChangeText={(v) => updateSet(exercise.tempId, set.setNumber, 'reps', v)}
                keyboardType="number-pad"
                editable={!set.completed}
            />
            <TouchableOpacity
                style={[styles.checkButton, set.completed && styles.checkButtonCompleted]}
                onPress={() => toggleSetComplete(exercise.tempId, set.setNumber)}
            >
                <Text style={[styles.checkButtonText, set.completed && styles.checkButtonTextCompleted]}>
                    {set.completed ? '✓' : '○'}
                </Text>
            </TouchableOpacity>
            {exercise.sets.length > 1 && (
                <TouchableOpacity
                    style={styles.removeSetButton}
                    onPress={() => removeSet(exercise.tempId, set.setNumber)}
                >
                    <Text style={styles.removeSetButtonText}>−</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    const renderExerciseCard = (exercise: ExerciseLogItem, index: number) => {
        const completedSets = getCompletedSets(exercise.sets);
        const totalSets = exercise.sets.length;

        return (
            <View key={exercise.tempId} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                    <View style={styles.exerciseNumber}>
                        <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                    </View>
                    <View style={styles.exerciseInfo}>
                        <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
                        <Text style={styles.setProgress}>
                            {completedSets}/{totalSets} sets
                        </Text>
                    </View>
                    {isQuickLog && (
                        <TouchableOpacity
                            style={styles.removeExerciseButton}
                            onPress={() => removeExercise(exercise.tempId)}
                        >
                            <Text style={styles.removeExerciseButtonText}>✕</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.setsHeader}>
                    <Text style={styles.setsHeaderText}>Set</Text>
                    <Text style={styles.setsHeaderText}>Weight</Text>
                    <Text style={styles.setsHeaderText}>Reps</Text>
                    <View style={{ width: 32 }} />
                </View>

                {exercise.sets.map(set => renderSetRow(exercise, set))}

                <TouchableOpacity
                    style={styles.addSetButton}
                    onPress={() => addSet(exercise.tempId)}
                >
                    <Text style={styles.addSetButtonText}>+ Add Set</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.cancelButton}>Cancel</Text>
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>
                        {isQuickLog ? 'Quick Log' : template?.name}
                    </Text>
                    <Text style={styles.timer}>{elapsedTime}</Text>
                </View>
                <TouchableOpacity onPress={saveWorkoutLog} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color={colors.primary} />
                    ) : (
                        <Text style={styles.saveButton}>Save</Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
                {isQuickLog && (
                    <TouchableOpacity
                        style={styles.addExerciseCard}
                        onPress={() => setShowExercisePicker(true)}
                    >
                        <Text style={styles.addExerciseCardText}>+ Add Exercise</Text>
                    </TouchableOpacity>
                )}

                {exerciseLogs.map((item, index) => renderExerciseCard(item, index))}

                {exerciseLogs.length === 0 && isQuickLog && (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyEmoji}>📝</Text>
                        <Text style={styles.emptyTitle}>Log Your Workout</Text>
                        <Text style={styles.emptyText}>
                            Add exercises to track your sets, reps, and weights
                        </Text>
                    </View>
                )}

                <View style={styles.notesSection}>
                    <Text style={styles.sectionTitle}>Notes</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="How was the workout? Any PRs?"
                        placeholderTextColor={colors.textMuted}
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                        maxLength={500}
                        textAlignVertical="top"
                    />
                </View>

                <View style={styles.durationSection}>
                    <Text style={styles.sectionTitle}>Duration (minutes)</Text>
                    <TextInput
                        style={styles.durationInput}
                        placeholder="Optional"
                        placeholderTextColor={colors.textMuted}
                        value={duration}
                        onChangeText={setDuration}
                        keyboardType="number-pad"
                    />
                </View>
            </ScrollView>

            <ExercisePicker
                visible={showExercisePicker}
                onSelect={addQuickExercise}
                onClose={() => setShowExercisePicker(false)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
    cancelButton: {
        ...typography.bodyLarge,
        color: colors.textMuted,
    },
    headerCenter: {
        alignItems: 'center',
    },
    headerTitle: {
        ...typography.labelLarge,
        color: colors.primary,
    },
    timer: {
        ...typography.bodySmall,
        color: colors.textMuted,
        marginTop: 2,
    },
    saveButton: {
        ...typography.bodyLarge,
        color: colors.primary,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        padding: spacing.md,
    },
    addExerciseCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        alignItems: 'center',
        marginBottom: spacing.md,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: colors.border,
    },
    addExerciseCardText: {
        ...typography.labelMedium,
        color: colors.primary,
    },
    exerciseCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.md,
        overflow: 'hidden',
    },
    exerciseHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    exerciseNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    exerciseNumberText: {
        ...typography.labelSmall,
        color: colors.background,
        fontWeight: '700',
    },
    exerciseInfo: {
        flex: 1,
    },
    exerciseName: {
        ...typography.bodyMedium,
        color: colors.textPrimary,
        fontWeight: '600',
    },
    setProgress: {
        ...typography.labelSmall,
        color: colors.textMuted,
    },
    removeExerciseButton: {
        padding: spacing.sm,
    },
    removeExerciseButtonText: {
        fontSize: 16,
        color: colors.error,
    },
    setsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
        gap: spacing.sm,
    },
    setsHeaderText: {
        ...typography.labelSmall,
        color: colors.textMuted,
        flex: 1,
        textAlign: 'center',
    },
    setRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        gap: spacing.sm,
    },
    setNumber: {
        ...typography.bodySmall,
        color: colors.textMuted,
        width: 24,
        textAlign: 'center',
    },
    setInput: {
        flex: 1,
        backgroundColor: colors.surfaceLight,
        borderRadius: borderRadius.sm,
        padding: spacing.sm,
        color: colors.textPrimary,
        ...typography.bodyMedium,
        textAlign: 'center',
    },
    setInputCompleted: {
        backgroundColor: colors.successLight,
    },
    setDivider: {
        ...typography.bodySmall,
        color: colors.textMuted,
    },
    checkButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkButtonCompleted: {
        backgroundColor: colors.success,
    },
    checkButtonText: {
        fontSize: 16,
        color: colors.textMuted,
    },
    checkButtonTextCompleted: {
        color: colors.background,
    },
    removeSetButton: {
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    removeSetButtonText: {
        fontSize: 18,
        color: colors.error,
    },
    addSetButton: {
        padding: spacing.md,
        alignItems: 'center',
    },
    addSetButtonText: {
        ...typography.labelSmall,
        color: colors.primary,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing.xxl,
    },
    emptyEmoji: {
        fontSize: 48,
        marginBottom: spacing.md,
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
    notesSection: {
        marginTop: spacing.md,
    },
    sectionTitle: {
        ...typography.labelSmall,
        color: colors.textMuted,
        marginBottom: spacing.sm,
    },
    input: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        color: colors.textPrimary,
        ...typography.bodyMedium,
    },
    textArea: {
        minHeight: 80,
    },
    durationSection: {
        marginTop: spacing.md,
    },
    durationInput: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        color: colors.textPrimary,
        ...typography.bodyMedium,
        width: 120,
    },
});
