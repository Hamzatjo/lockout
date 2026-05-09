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
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { colors, typography } from '../theme';
import { supabase } from '../lib/supabase';
import ProgressChart, { ProgressDataPoint } from '../components/ProgressChart';
import { EXERCISES, Exercise, getExerciseName } from '../data/exercises';
import { MainStackParamList } from '../navigation/MainNavigator';

type ExerciseProgressScreenRouteProp = RouteProp<MainStackParamList, 'ExerciseProgress'>;

interface ExerciseStats {
    currentPR: number;
    estimated1RM: number;
    totalVolume: number;
    sessionCount: number;
}

export default function ExerciseProgressScreen() {
    const route = useRoute<ExerciseProgressScreenRouteProp>();
    const navigation = useNavigation();
    const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(
        route.params?.exercise || null
    );
    const [progressData, setProgressData] = useState<ProgressDataPoint[]>([]);
    const [stats, setStats] = useState<ExerciseStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [showExercisePicker, setShowExercisePicker] = useState(!route.params?.exercise);

    useEffect(() => {
        if (selectedExercise) {
            fetchExerciseProgress();
        }
    }, [selectedExercise]);

    const fetchExerciseProgress = async () => {
        if (!selectedExercise) return;

        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch workout data for this exercise
            const { data: workoutData, error } = await supabase
                .from('workouts')
                .select('weight_kg, reps, created_at')
                .eq('user_id', user.id)
                .eq('exercise_type', selectedExercise.id)
                .not('weight_kg', 'is', null)
                .not('reps', 'is', null)
                .order('created_at', { ascending: true });

            if (error) throw error;

            if (!workoutData || workoutData.length === 0) {
                setProgressData([]);
                setStats(null);
                return;
            }

            // Convert to progress data points
            const progressPoints: ProgressDataPoint[] = workoutData.map(workout => ({
                date: workout.created_at,
                weight: workout.weight_kg!,
            }));

            setProgressData(progressPoints);

            // Calculate stats
            const weights = workoutData.map(w => w.weight_kg!);
            const currentPR = Math.max(...weights);

            // Find the workout with the current PR to get reps for 1RM calculation
            const prWorkout = workoutData.find(w => w.weight_kg === currentPR);
            const prReps = prWorkout?.reps || 1;

            // Estimate 1RM using Epley formula: weight * (1 + reps/30)
            const estimated1RM = currentPR * (1 + prReps / 30);

            // Calculate total volume (weight * reps for all sessions)
            const totalVolume = workoutData.reduce((sum, workout) => {
                return sum + (workout.weight_kg! * workout.reps!);
            }, 0);

            setStats({
                currentPR,
                estimated1RM,
                totalVolume,
                sessionCount: workoutData.length,
            });

        } catch (error) {
            console.error('Error fetching exercise progress:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderExercisePicker = () => {
        if (!showExercisePicker) return null;

        return (
            <View style={styles.exercisePickerContainer}>
                <Text style={styles.pickerTitle}>Select Exercise</Text>
                <ScrollView style={styles.exerciseList} showsVerticalScrollIndicator={false}>
                    {EXERCISES.map(exercise => (
                        <TouchableOpacity
                            key={exercise.id}
                            style={[
                                styles.exerciseOption,
                                selectedExercise?.id === exercise.id && styles.selectedExercise
                            ]}
                            onPress={() => {
                                setSelectedExercise(exercise);
                                setShowExercisePicker(false);
                            }}
                        >
                            <Text style={[
                                styles.exerciseOptionText,
                                selectedExercise?.id === exercise.id && styles.selectedExerciseText
                            ]}>
                                {exercise.name}
                            </Text>
                            <Text style={styles.muscleGroupText}>
                                {exercise.muscleGroup.toUpperCase()}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        );
    };

    const renderStats = () => {
        if (!stats) return null;

        return (
            <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                    <Text style={styles.statValue}>{stats.currentPR.toFixed(1)} kg</Text>
                    <Text style={styles.statLabel}>Current PR</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statValue}>{stats.estimated1RM.toFixed(1)} kg</Text>
                    <Text style={styles.statLabel}>Est. 1RM</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statValue}>{stats.totalVolume.toLocaleString()}</Text>
                    <Text style={styles.statLabel}>Total Volume</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statValue}>{stats.sessionCount}</Text>
                    <Text style={styles.statLabel}>Sessions</Text>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loading}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Loading progress data...</Text>
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
                    <Text style={styles.title}>Exercise Progress</Text>
                </View>

                {/* Exercise Selector */}
                <TouchableOpacity
                    style={styles.exerciseSelector}
                    onPress={() => setShowExercisePicker(!showExercisePicker)}
                >
                    <Text style={styles.selectedExerciseName}>
                        {selectedExercise ? selectedExercise.name : 'Select Exercise'}
                    </Text>
                    <Text style={styles.dropdownIcon}>
                        {showExercisePicker ? '▲' : '▼'}
                    </Text>
                </TouchableOpacity>

                {renderExercisePicker()}

                {selectedExercise && !showExercisePicker && (
                    <>
                        {progressData.length > 0 ? (
                            <>
                                {/* Progress Chart */}
                                <ProgressChart
                                    data={progressData}
                                    exerciseName={selectedExercise.name}
                                    width={350}
                                    height={250}
                                />

                                {/* Stats */}
                                {renderStats()}

                                {/* Additional Info */}
                                <View style={styles.infoSection}>
                                    <Text style={styles.infoTitle}>Progress Notes</Text>
                                    <Text style={styles.infoText}>
                                        • 1RM estimation uses the Epley formula
                                    </Text>
                                    <Text style={styles.infoText}>
                                        • Total volume = weight × reps across all sessions
                                    </Text>
                                    <Text style={styles.infoText}>
                                        • Chart shows weight progression over time
                                    </Text>
                                </View>
                            </>
                        ) : (
                            <View style={styles.noDataContainer}>
                                <Text style={styles.noDataTitle}>No Progress Data</Text>
                                <Text style={styles.noDataText}>
                                    Start logging workouts with weight and reps for {selectedExercise.name} to see your progress here.
                                </Text>
                            </View>
                        )}
                    </>
                )}
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        paddingBottom: 10,
    },
    backButton: {
        marginRight: 16,
    },
    backButtonText: {
        ...typography.bodyMedium,
        color: colors.primary,
        fontWeight: '600',
    },
    title: {
        ...typography.headlineMedium,
        color: colors.textPrimary,
        fontWeight: '700',
    },
    exerciseSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.surface,
        margin: 16,
        padding: 16,
        borderRadius: 12,
    },
    selectedExerciseName: {
        ...typography.bodyLarge,
        color: colors.textPrimary,
        fontWeight: '600',
    },
    dropdownIcon: {
        ...typography.bodyMedium,
        color: colors.textMuted,
    },
    exercisePickerContainer: {
        margin: 16,
        marginTop: 0,
        backgroundColor: colors.surface,
        borderRadius: 12,
        maxHeight: 300,
    },
    pickerTitle: {
        ...typography.bodyLarge,
        color: colors.textPrimary,
        fontWeight: '600',
        padding: 16,
        paddingBottom: 8,
    },
    exerciseList: {
        maxHeight: 250,
    },
    exerciseOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    selectedExercise: {
        backgroundColor: 'rgba(0, 255, 135, 0.1)',
    },
    exerciseOptionText: {
        ...typography.bodyMedium,
        color: colors.textPrimary,
        flex: 1,
    },
    selectedExerciseText: {
        color: colors.primary,
        fontWeight: '600',
    },
    muscleGroupText: {
        ...typography.labelSmall,
        color: colors.textMuted,
        fontSize: 10,
    },
    statsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        margin: 16,
        marginTop: 8,
    },
    statCard: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        margin: 4,
        flex: 1,
        minWidth: '45%',
        alignItems: 'center',
    },
    statValue: {
        ...typography.headlineSmall,
        color: colors.primary,
        fontWeight: '700',
        marginBottom: 4,
    },
    statLabel: {
        ...typography.labelMedium,
        color: colors.textMuted,
        textAlign: 'center',
    },
    infoSection: {
        margin: 16,
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
    },
    infoTitle: {
        ...typography.bodyLarge,
        color: colors.textPrimary,
        fontWeight: '600',
        marginBottom: 12,
    },
    infoText: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
        marginBottom: 4,
    },
    noDataContainer: {
        margin: 16,
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 32,
        alignItems: 'center',
    },
    noDataTitle: {
        ...typography.bodyLarge,
        color: colors.textPrimary,
        fontWeight: '600',
        marginBottom: 8,
    },
    noDataText: {
        ...typography.bodyMedium,
        color: colors.textMuted,
        textAlign: 'center',
        lineHeight: 20,
    },
});