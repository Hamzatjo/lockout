import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    ScrollView,
    Animated,
    Dimensions,
    Vibration,
    AppState,
    AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '../theme';
import { supabase } from '../lib/supabase';
import { getExerciseName, Exercise, EXERCISES, MUSCLE_GROUP_ICONS } from '../data/exercises';
import ExercisePicker from '../components/ExercisePicker';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

const { width } = Dimensions.get('window');

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
    muscleGroup: string;
    sets: SetLog[];
};

type Props = {
    navigation: NativeStackNavigationProp<any>;
    route: { params?: { workout?: any; scheduleEventId?: string } };
};

export default function ActiveWorkoutScreen({ navigation, route }: Props) {
    const template = route.params?.workout;
    const scheduleEventId = route.params?.scheduleEventId;
    const isQuickLog = !template;

    const [exerciseLogs, setExerciseLogs] = useState<ExerciseLogItem[]>([]);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [showExercisePicker, setShowExercisePicker] = useState(false);
    const [startTime] = useState(Date.now());
    const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [workoutComplete, setWorkoutComplete] = useState(false);
    const [pausedDuration, setPausedDuration] = useState(0);

    const pulseAnim = useRef(new Animated.Value(1)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;
    const celebrationScale = useRef(new Animated.Value(0)).current;
    const pauseStartTime = useRef<number | null>(null);
    const appState = useRef(AppState.currentState);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
                pauseStartTime.current = Date.now();
            } else if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
                if (pauseStartTime.current && !isPaused) {
                    setPausedDuration(prev => prev + (Date.now() - pauseStartTime.current!));
                }
                pauseStartTime.current = null;
            }
            appState.current = nextAppState;
        });

        return () => subscription.remove();
    }, [isPaused]);

    useEffect(() => {
        if (template?.exercises) {
            const logs: ExerciseLogItem[] = template.exercises.map((e: any, idx: number) => {
                const exercise = EXERCISES.find(ex => ex.id === e.exercise_type);
                return {
                    tempId: `template-${idx}`,
                    exerciseType: e.exercise_type,
                    exerciseName: getExerciseName(e.exercise_type),
                    muscleGroup: exercise?.muscleGroup || 'chest',
                    sets: Array.from({ length: e.sets }, (_, i) => ({
                        setNumber: i + 1,
                        weight: '',
                        reps: e.reps_min ? e.reps_min.toString() : '',
                        completed: false,
                    })),
                };
            });
            setExerciseLogs(logs);
        }
    }, [template]);

    useEffect(() => {
        if (!isPaused && !workoutComplete) {
            const interval = setInterval(() => {
                setElapsedSeconds(Math.floor((Date.now() - startTime - pausedDuration) / 1000));
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [isPaused, workoutComplete, pausedDuration]);

    useEffect(() => {
        if (isPaused) {
            pauseStartTime.current = Date.now();
        } else if (pauseStartTime.current) {
            setPausedDuration(prev => prev + (Date.now() - pauseStartTime.current!));
            pauseStartTime.current = null;
        }
    }, [isPaused]);

    useEffect(() => {
        if (!isPaused && !workoutComplete) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [isPaused, workoutComplete]);

    useEffect(() => {
        const totalSets = exerciseLogs.reduce((sum, e) => sum + e.sets.length, 0);
        const completedSets = exerciseLogs.reduce((sum, e) => sum + e.sets.filter(s => s.completed).length, 0);
        const progress = totalSets > 0 ? completedSets / totalSets : 0;
        
        Animated.spring(progressAnim, {
            toValue: progress,
            useNativeDriver: false,
            friction: 8,
        }).start();

        if (progress === 1 && totalSets > 0 && !workoutComplete) {
            setWorkoutComplete(true);
            Animated.spring(celebrationScale, {
                toValue: 1,
                useNativeDriver: true,
                friction: 5,
            }).start();
            Vibration.vibrate([0, 100, 50, 100]);
        }
    }, [exerciseLogs]);

    const formatTime = (seconds: number): string => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getCurrentExercise = (): ExerciseLogItem | null => {
        return exerciseLogs[currentExerciseIndex] || null;
    };

    const addQuickExercise = (exercise: Exercise) => {
        const newLog: ExerciseLogItem = {
            tempId: `quick-${Date.now()}`,
            exerciseType: exercise.id,
            exerciseName: exercise.name,
            muscleGroup: exercise.muscleGroup,
            sets: [
                { setNumber: 1, weight: '', reps: '', completed: false },
                { setNumber: 2, weight: '', reps: '', completed: false },
                { setNumber: 3, weight: '', reps: '', completed: false },
            ],
        };
        setExerciseLogs([...exerciseLogs, newLog]);
        setShowExercisePicker(false);
        setCurrentExerciseIndex(exerciseLogs.length);
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

    const updateSet = (tempId: string, setNumber: number, field: 'weight' | 'reps', value: string) => {
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

    const completeSet = (tempId: string, setNumber: number) => {
        const exercise = exerciseLogs.find(e => e.tempId === tempId);
        const set = exercise?.sets.find(s => s.setNumber === setNumber);
        
        if (!set?.weight && !set?.reps) {
            Alert.alert('Empty Set', 'Enter weight or reps before completing');
            return;
        }

        Vibration.vibrate(50);

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

    const goToNextExercise = () => {
        if (currentExerciseIndex < exerciseLogs.length - 1) {
            setCurrentExerciseIndex(currentExerciseIndex + 1);
        }
    };

    const goToPrevExercise = () => {
        if (currentExerciseIndex > 0) {
            setCurrentExerciseIndex(currentExerciseIndex - 1);
        }
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
                    schedule_event_id: scheduleEventId || null,
                    duration_minutes: Math.round(elapsedSeconds / 60),
                    notes: notes.trim() || null,
                    completed: true,
                })
                .select('id')
                .single();

            if (logError) throw logError;

            const exerciseLogData: Array<any> = [];

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

            navigation.goBack();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to save workout log');
        } finally {
            setLoading(false);
        }
    };

    const totalSets = exerciseLogs.reduce((sum, e) => sum + e.sets.length, 0);
    const completedSets = exerciseLogs.reduce((sum, e) => sum + e.sets.filter(s => s.completed).length, 0);
    const currentExercise = getCurrentExercise();

    if (workoutComplete) {
        return (
            <SafeAreaView style={styles.container}>
                <Animated.View style={[styles.celebrationContainer, { transform: [{ scale: celebrationScale }] }]}>
                    <Text style={styles.celebrationEmoji}>🎉</Text>
                    <Text style={styles.celebrationTitle}>WORKOUT COMPLETE!</Text>
                    <Text style={styles.celebrationStats}>
                        {completedSets} sets • {formatTime(elapsedSeconds)}
                    </Text>
                    <Text style={styles.celebrationSubtext}>
                        {template?.name || 'Quick Workout'}
                    </Text>

                    <View style={styles.celebrationActions}>
                        <TouchableOpacity
                            style={styles.finishButton}
                            onPress={saveWorkoutLog}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={colors.background} />
                            ) : (
                                <Text style={styles.finishButtonText}>FINISH & SAVE</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.addMoreButton}
                            onPress={() => {
                                setWorkoutComplete(false);
                                setShowExercisePicker(true);
                            }}
                        >
                            <Text style={styles.addMoreButtonText}>Add More Exercises</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity 
                    style={styles.closeButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
                
                <Animated.View style={[styles.timerContainer, { transform: [{ scale: pulseAnim }] }]}>
                    <Text style={styles.timerLabel}>
                        {isPaused ? 'PAUSED' : template?.name?.toUpperCase() || 'WORKOUT'}
                    </Text>
                    <Text style={styles.timer}>{formatTime(elapsedSeconds)}</Text>
                </Animated.View>

                <TouchableOpacity 
                    style={styles.pauseButton}
                    onPress={() => setIsPaused(!isPaused)}
                >
                    <Text style={styles.pauseButtonText}>{isPaused ? '▶' : '⏸'}</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.progressBar}>
                <Animated.View 
                    style={[
                        styles.progressFill, 
                        { flex: progressAnim }
                    ]} 
                />
            </View>

            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{completedSets}</Text>
                    <Text style={styles.statLabel}>Done</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{totalSets - completedSets}</Text>
                    <Text style={styles.statLabel}>Left</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{exerciseLogs.length}</Text>
                    <Text style={styles.statLabel}>Exercises</Text>
                </View>
            </View>

            {exerciseLogs.length === 0 ? (
                <View style={styles.emptyWorkout}>
                    <Text style={styles.emptyEmoji}>🏋️</Text>
                    <Text style={styles.emptyTitle}>Ready to start?</Text>
                    <Text style={styles.emptyText}>Add your first exercise</Text>
                    <TouchableOpacity
                        style={styles.addFirstExerciseButton}
                        onPress={() => setShowExercisePicker(true)}
                    >
                        <Text style={styles.addFirstExerciseButtonText}>Add Exercise</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <>
                    <View style={styles.exerciseNav}>
                        <TouchableOpacity
                            style={[styles.exerciseNavButton, currentExerciseIndex === 0 && styles.exerciseNavDisabled]}
                            onPress={goToPrevExercise}
                            disabled={currentExerciseIndex === 0}
                        >
                            <Text style={styles.exerciseNavText}>‹</Text>
                        </TouchableOpacity>
                        
                        <Text style={styles.exerciseCounter}>
                            {currentExerciseIndex + 1} / {exerciseLogs.length}
                        </Text>

                        <TouchableOpacity
                            style={[styles.exerciseNavButton, currentExerciseIndex === exerciseLogs.length - 1 && styles.exerciseNavDisabled]}
                            onPress={goToNextExercise}
                            disabled={currentExerciseIndex === exerciseLogs.length - 1}
                        >
                            <Text style={styles.exerciseNavText}>›</Text>
                        </TouchableOpacity>
                    </View>

                    {currentExercise && (
                        <View style={styles.currentExercise}>
                            <View style={styles.exerciseHeader}>
                                <Text style={styles.exerciseEmoji}>
                                    {MUSCLE_GROUP_ICONS[currentExercise.muscleGroup as keyof typeof MUSCLE_GROUP_ICONS] || '💪'}
                                </Text>
                                <Text style={styles.exerciseName}>{currentExercise.exerciseName}</Text>
                                {isQuickLog && (
                                    <TouchableOpacity
                                        style={styles.addSetButton}
                                        onPress={() => addSet(currentExercise.tempId)}
                                    >
                                        <Text style={styles.addSetButtonText}>+ Set</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            <ScrollView style={styles.setsList} showsVerticalScrollIndicator={false}>
                                {currentExercise.sets.map((set) => (
                                    <View key={`${currentExercise.tempId}-${set.setNumber}`} style={styles.setRow}>
                                        <View style={styles.setNumberCircle}>
                                            <Text style={styles.setNumberText}>{set.setNumber}</Text>
                                        </View>
                                        
                                        <TextInput
                                            style={[styles.setInput, set.completed && styles.setInputCompleted]}
                                            placeholder="kg"
                                            placeholderTextColor={colors.textMuted}
                                            value={set.weight}
                                            onChangeText={(v) => updateSet(currentExercise.tempId, set.setNumber, 'weight', v)}
                                            keyboardType="decimal-pad"
                                            editable={!set.completed}
                                        />
                                        
                                        <Text style={styles.setDivider}>×</Text>
                                        
                                        <TextInput
                                            style={[styles.setInput, set.completed && styles.setInputCompleted]}
                                            placeholder="reps"
                                            placeholderTextColor={colors.textMuted}
                                            value={set.reps}
                                            onChangeText={(v) => updateSet(currentExercise.tempId, set.setNumber, 'reps', v)}
                                            keyboardType="number-pad"
                                            editable={!set.completed}
                                        />
                                        
                                        <TouchableOpacity
                                            style={[styles.checkButton, set.completed && styles.checkButtonDone]}
                                            onPress={() => completeSet(currentExercise.tempId, set.setNumber)}
                                        >
                                            <Text style={[styles.checkButtonText, set.completed && styles.checkButtonTextDone]}>
                                                {set.completed ? '✓' : '○'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                ))}

                                <TouchableOpacity
                                    style={styles.addSetRow}
                                    onPress={() => addSet(currentExercise.tempId)}
                                >
                                    <Text style={styles.addSetRowText}>+ Add Set</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    )}

                    <View style={styles.exerciseList}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {exerciseLogs.map((exercise, idx) => {
                                const completedInExercise = exercise.sets.filter(s => s.completed).length;
                                const isActive = idx === currentExerciseIndex;
                                
                                return (
                                    <TouchableOpacity
                                        key={exercise.tempId}
                                        style={[styles.exerciseDot, isActive && styles.exerciseDotActive]}
                                        onPress={() => setCurrentExerciseIndex(idx)}
                                    >
                                        <Text style={[styles.exerciseDotText, isActive && styles.exerciseDotTextActive]}>
                                            {completedInExercise}/{exercise.sets.length}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                            <TouchableOpacity
                                style={styles.addExerciseDot}
                                onPress={() => setShowExercisePicker(true)}
                            >
                                <Text style={styles.addExerciseDotText}>+</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </>
            )}

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
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    closeButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: 20,
        color: colors.textPrimary,
    },
    timerContainer: {
        alignItems: 'center',
    },
    timerLabel: {
        ...typography.labelSmall,
        color: colors.textMuted,
        letterSpacing: 2,
    },
    timer: {
        ...typography.displayMedium,
        color: colors.primary,
        fontVariant: ['tabular-nums'],
    },
    pauseButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pauseButtonText: {
        fontSize: 18,
        color: colors.textPrimary,
    },
    progressBar: {
        height: 4,
        backgroundColor: colors.surface,
        flexDirection: 'row',
    },
    progressFill: {
        backgroundColor: colors.primary,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        ...typography.headlineMedium,
        color: colors.textPrimary,
    },
    statLabel: {
        ...typography.labelSmall,
        color: colors.textMuted,
    },
    exerciseNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    exerciseNavButton: {
        padding: spacing.sm,
    },
    exerciseNavDisabled: {
        opacity: 0.3,
    },
    exerciseNavText: {
        fontSize: 32,
        color: colors.primary,
    },
    exerciseCounter: {
        ...typography.labelMedium,
        color: colors.textMuted,
    },
    currentExercise: {
        flex: 1,
        paddingHorizontal: spacing.md,
    },
    exerciseHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    exerciseEmoji: {
        fontSize: 32,
        marginRight: spacing.sm,
    },
    exerciseName: {
        ...typography.headlineMedium,
        color: colors.textPrimary,
        flex: 1,
    },
    addSetButton: {
        backgroundColor: colors.surfaceLight,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
    },
    addSetButtonText: {
        ...typography.labelSmall,
        color: colors.primary,
    },
    setsList: {
        flex: 1,
    },
    setRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
        gap: spacing.sm,
    },
    setNumberCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    setNumberText: {
        ...typography.labelSmall,
        color: colors.textMuted,
    },
    setInput: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        color: colors.textPrimary,
        ...typography.bodyLarge,
        textAlign: 'center',
    },
    setInputCompleted: {
        backgroundColor: colors.successLight,
    },
    setDivider: {
        ...typography.bodyMedium,
        color: colors.textMuted,
    },
    checkButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.border,
    },
    checkButtonDone: {
        backgroundColor: colors.success,
        borderColor: colors.success,
    },
    checkButtonText: {
        fontSize: 20,
        color: colors.textMuted,
    },
    checkButtonTextDone: {
        color: colors.background,
        fontWeight: '700',
    },
    addSetRow: {
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        marginTop: spacing.sm,
    },
    addSetRowText: {
        ...typography.labelMedium,
        color: colors.primary,
    },
    exerciseList: {
        flexDirection: 'row',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    exerciseDot: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.sm,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    exerciseDotActive: {
        borderColor: colors.primary,
        backgroundColor: colors.surfaceLight,
    },
    exerciseDotText: {
        ...typography.labelSmall,
        color: colors.textMuted,
    },
    exerciseDotTextActive: {
        color: colors.primary,
        fontWeight: '700',
    },
    addExerciseDot: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: colors.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.border,
        borderStyle: 'dashed',
    },
    addExerciseDotText: {
        fontSize: 24,
        color: colors.textMuted,
    },
    emptyWorkout: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
    },
    emptyEmoji: {
        fontSize: 64,
        marginBottom: spacing.lg,
    },
    emptyTitle: {
        ...typography.headlineLarge,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    emptyText: {
        ...typography.bodyMedium,
        color: colors.textMuted,
        marginBottom: spacing.xl,
    },
    addFirstExerciseButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
    },
    addFirstExerciseButtonText: {
        ...typography.labelLarge,
        color: colors.background,
        fontWeight: '700',
    },
    celebrationContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
    },
    celebrationEmoji: {
        fontSize: 80,
        marginBottom: spacing.lg,
    },
    celebrationTitle: {
        ...typography.displayMedium,
        color: colors.primary,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    celebrationStats: {
        ...typography.headlineMedium,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    celebrationSubtext: {
        ...typography.bodyMedium,
        color: colors.textMuted,
        marginBottom: spacing.xxl,
    },
    celebrationActions: {
        width: '100%',
        gap: spacing.md,
    },
    finishButton: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.lg,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
    },
    finishButtonText: {
        ...typography.labelLarge,
        color: colors.background,
        fontWeight: '700',
    },
    addMoreButton: {
        backgroundColor: colors.surface,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
    },
    addMoreButtonText: {
        ...typography.labelMedium,
        color: colors.textPrimary,
    },
});
