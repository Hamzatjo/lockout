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
import ExercisePicker from '../components/ExercisePicker';
import { Exercise, MUSCLE_GROUP_LABELS } from '../data/exercises';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type WorkoutExerciseItem = {
    tempId: string;
    exercise: Exercise;
    sets: number;
    repsMin: number;
    repsMax: number;
    restSeconds: number;
    notes: string;
};

type Props = {
    navigation: NativeStackNavigationProp<any>;
    route: { params?: { workout?: any } };
};

export default function EditWorkoutScreen({ navigation, route }: Props) {
    const existingWorkout = route.params?.workout;
    const isEditing = !!existingWorkout;

    const [name, setName] = useState(existingWorkout?.name || '');
    const [description, setDescription] = useState(existingWorkout?.description || '');
    const [exercises, setExercises] = useState<WorkoutExerciseItem[]>(
        existingWorkout?.exercises?.map((e: any, idx: number) => ({
            tempId: `existing-${idx}`,
            exercise: { id: e.exercise_type, name: '', muscleGroup: 'chest' as const },
            sets: e.sets || 3,
            repsMin: e.reps_min || 8,
            repsMax: e.reps_max || 12,
            restSeconds: e.rest_seconds || 90,
            notes: e.notes || '',
        })) || []
    );
    const [showExercisePicker, setShowExercisePicker] = useState(false);
    const [loading, setLoading] = useState(false);

    const addExercise = (exercise: Exercise) => {
        const newExercise: WorkoutExerciseItem = {
            tempId: `temp-${Date.now()}`,
            exercise,
            sets: 3,
            repsMin: 8,
            repsMax: 12,
            restSeconds: 90,
            notes: '',
        };
        setExercises([...exercises, newExercise]);
        setShowExercisePicker(false);
    };

    const removeExercise = (tempId: string) => {
        setExercises(exercises.filter(e => e.tempId !== tempId));
    };

    const updateExercise = (tempId: string, updates: Partial<WorkoutExerciseItem>) => {
        setExercises(exercises.map(e => 
            e.tempId === tempId ? { ...e, ...updates } : e
        ));
    };

    const moveExercise = (index: number, direction: 'up' | 'down') => {
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= exercises.length) return;

        const newExercises = [...exercises];
        [newExercises[index], newExercises[newIndex]] = [newExercises[newIndex], newExercises[index]];
        setExercises(newExercises);
    };

    const saveWorkout = async () => {
        if (!name.trim()) {
            Alert.alert('Name Required', 'Please enter a name for your workout');
            return;
        }

        if (exercises.length === 0) {
            Alert.alert('Add Exercises', 'Add at least one exercise to your workout');
            return;
        }

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            if (isEditing && existingWorkout) {
                const { error: workoutError } = await supabase
                    .from('custom_workouts')
                    .update({
                        name: name.trim(),
                        description: description.trim() || null,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', existingWorkout.id);

                if (workoutError) throw workoutError;

                await supabase
                    .from('workout_exercises')
                    .delete()
                    .eq('workout_id', existingWorkout.id);

                const exerciseData = exercises.map((e, index) => ({
                    workout_id: existingWorkout.id,
                    exercise_type: e.exercise.id,
                    sets: e.sets,
                    reps_min: e.repsMin,
                    reps_max: e.repsMax,
                    rest_seconds: e.restSeconds,
                    notes: e.notes || null,
                    order_index: index,
                }));

                const { error: exercisesError } = await supabase
                    .from('workout_exercises')
                    .insert(exerciseData);

                if (exercisesError) throw exercisesError;
            } else {
                const { data: workoutData, error: workoutError } = await supabase
                    .from('custom_workouts')
                    .insert({
                        user_id: user.id,
                        name: name.trim(),
                        description: description.trim() || null,
                    })
                    .select('id')
                    .single();

                if (workoutError) throw workoutError;

                const exerciseData = exercises.map((e, index) => ({
                    workout_id: workoutData.id,
                    exercise_type: e.exercise.id,
                    sets: e.sets,
                    reps_min: e.repsMin,
                    reps_max: e.repsMax,
                    rest_seconds: e.restSeconds,
                    notes: e.notes || null,
                    order_index: index,
                }));

                const { error: exercisesError } = await supabase
                    .from('workout_exercises')
                    .insert(exerciseData);

                if (exercisesError) throw exercisesError;
            }

            navigation.goBack();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to save workout');
        } finally {
            setLoading(false);
        }
    };

    const renderExerciseCard = (item: WorkoutExerciseItem, index: number) => (
        <View key={item.tempId} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
                <View style={styles.exerciseNumber}>
                    <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseName}>{item.exercise.name}</Text>
                    <Text style={styles.exerciseMuscle}>
                        {MUSCLE_GROUP_LABELS[item.exercise.muscleGroup]}
                    </Text>
                </View>
                <View style={styles.exerciseMoveButtons}>
                    <TouchableOpacity
                        onPress={() => moveExercise(index, 'up')}
                        disabled={index === 0}
                        style={[styles.moveButton, index === 0 && styles.moveButtonDisabled]}
                    >
                        <Text style={styles.moveButtonText}>↑</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => moveExercise(index, 'down')}
                        disabled={index === exercises.length - 1}
                        style={[styles.moveButton, index === exercises.length - 1 && styles.moveButtonDisabled]}
                    >
                        <Text style={styles.moveButtonText}>↓</Text>
                    </TouchableOpacity>
                </View>
                <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeExercise(item.tempId)}
                >
                    <Text style={styles.removeButtonText}>✕</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.exerciseDetails}>
                <View style={styles.detailRow}>
                    <View style={styles.detailField}>
                        <Text style={styles.detailLabel}>Sets</Text>
                        <TextInput
                            style={styles.detailInput}
                            value={item.sets.toString()}
                            onChangeText={(v) => updateExercise(item.tempId, { sets: parseInt(v) || 0 })}
                            keyboardType="number-pad"
                        />
                    </View>
                    <View style={styles.detailField}>
                        <Text style={styles.detailLabel}>Min Reps</Text>
                        <TextInput
                            style={styles.detailInput}
                            value={item.repsMin.toString()}
                            onChangeText={(v) => updateExercise(item.tempId, { repsMin: parseInt(v) || 0 })}
                            keyboardType="number-pad"
                        />
                    </View>
                    <View style={styles.detailField}>
                        <Text style={styles.detailLabel}>Max Reps</Text>
                        <TextInput
                            style={styles.detailInput}
                            value={item.repsMax.toString()}
                            onChangeText={(v) => updateExercise(item.tempId, { repsMax: parseInt(v) || 0 })}
                            keyboardType="number-pad"
                        />
                    </View>
                    <View style={styles.detailField}>
                        <Text style={styles.detailLabel}>Rest (s)</Text>
                        <TextInput
                            style={styles.detailInput}
                            value={item.restSeconds.toString()}
                            onChangeText={(v) => updateExercise(item.tempId, { restSeconds: parseInt(v) || 0 })}
                            keyboardType="number-pad"
                        />
                    </View>
                </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.cancelButton}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isEditing ? 'Edit Workout' : 'New Workout'}</Text>
                <TouchableOpacity onPress={saveWorkout} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color={colors.primary} />
                    ) : (
                        <Text style={styles.saveButton}>Save</Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
                <View style={styles.field}>
                    <Text style={styles.label}>Workout Name *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g., Push Day, Leg Day..."
                        placeholderTextColor={colors.textMuted}
                        value={name}
                        onChangeText={setName}
                        maxLength={50}
                    />
                </View>

                <View style={styles.field}>
                    <Text style={styles.label}>Description</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Optional notes about this workout..."
                        placeholderTextColor={colors.textMuted}
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        maxLength={200}
                        textAlignVertical="top"
                    />
                </View>

                <View style={styles.exercisesSection}>
                    <View style={styles.exercisesHeader}>
                        <Text style={styles.sectionTitle}>Exercises ({exercises.length})</Text>
                        <TouchableOpacity
                            style={styles.addExerciseButton}
                            onPress={() => setShowExercisePicker(true)}
                        >
                            <Text style={styles.addExerciseText}>+ Add</Text>
                        </TouchableOpacity>
                    </View>

                    {exercises.length === 0 ? (
                        <View style={styles.noExercises}>
                            <Text style={styles.noExercisesText}>
                                Tap "+ Add" to add exercises to your workout
                            </Text>
                        </View>
                    ) : (
                        exercises.map((item, index) => renderExerciseCard(item, index))
                    )}
                </View>
            </ScrollView>

            <ExercisePicker
                visible={showExercisePicker}
                onSelect={addExercise}
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
    headerTitle: {
        ...typography.labelLarge,
        color: colors.primary,
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
    field: {
        marginBottom: spacing.lg,
    },
    label: {
        ...typography.labelSmall,
        color: colors.textMuted,
        marginBottom: spacing.xs,
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
    exercisesSection: {
        marginTop: spacing.sm,
    },
    exercisesHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    sectionTitle: {
        ...typography.headlineSmall,
        color: colors.textPrimary,
    },
    addExerciseButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
    },
    addExerciseText: {
        ...typography.labelSmall,
        color: colors.background,
        fontWeight: '700',
    },
    noExercises: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        padding: spacing.xl,
        alignItems: 'center',
    },
    noExercisesText: {
        ...typography.bodyMedium,
        color: colors.textMuted,
        textAlign: 'center',
    },
    exerciseCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
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
    exerciseMuscle: {
        ...typography.labelSmall,
        color: colors.textMuted,
    },
    exerciseMoveButtons: {
        flexDirection: 'row',
        marginRight: spacing.sm,
    },
    moveButton: {
        padding: spacing.xs,
    },
    moveButtonDisabled: {
        opacity: 0.3,
    },
    moveButtonText: {
        fontSize: 16,
        color: colors.textMuted,
    },
    removeButton: {
        padding: spacing.xs,
    },
    removeButtonText: {
        fontSize: 18,
        color: colors.error,
    },
    exerciseDetails: {
        padding: spacing.md,
    },
    detailRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    detailField: {
        flex: 1,
    },
    detailLabel: {
        ...typography.labelSmall,
        color: colors.textMuted,
        marginBottom: spacing.xs,
        textAlign: 'center',
    },
    detailInput: {
        backgroundColor: colors.surfaceLight,
        borderRadius: borderRadius.sm,
        padding: spacing.sm,
        color: colors.textPrimary,
        ...typography.bodyMedium,
        textAlign: 'center',
    },
});
