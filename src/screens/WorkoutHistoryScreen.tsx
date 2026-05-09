import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    ActivityIndicator,
} from 'react-native';
import { colors, typography } from '../theme';
import { supabase } from '../lib/supabase';

interface WorkoutHistoryItem {
    id: string;
    verification_level: 'check_in' | 'log' | 'tribunal';
    exercise_type: string | null;
    weight_kg: number | null;
    reps: number | null;
    points: number;
    created_at: string;
    is_verified: boolean;
}

type FilterType = 'all' | 'check_in' | 'tribunal' | 'log';

export default function WorkoutHistoryScreen() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [workouts, setWorkouts] = useState<Record<string, WorkoutHistoryItem[]>>({});
    const [selectedDayWorkouts, setSelectedDayWorkouts] = useState<WorkoutHistoryItem[]>([]);
    const [filter, setFilter] = useState<FilterType>('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWorkoutHistory();
    }, [currentDate]);

    useEffect(() => {
        updateSelectedDayWorkouts();
    }, [selectedDate, workouts, filter]);

    const fetchWorkoutHistory = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get first and last day of current month
            const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

            const { data: workoutData, error } = await supabase
                .from('workouts')
                .select('id, verification_level, exercise_type, weight_kg, reps, points, created_at, is_verified')
                .eq('user_id', user.id)
                .gte('created_at', firstDay.toISOString())
                .lte('created_at', lastDay.toISOString())
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Group workouts by date
            const groupedWorkouts: Record<string, WorkoutHistoryItem[]> = {};
            workoutData?.forEach(workout => {
                const date = new Date(workout.created_at).toDateString();
                if (!groupedWorkouts[date]) {
                    groupedWorkouts[date] = [];
                }
                groupedWorkouts[date].push(workout);
            });

            setWorkouts(groupedWorkouts);
        } catch (error) {
            console.error('Error fetching workout history:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateSelectedDayWorkouts = () => {
        const dateKey = selectedDate.toDateString();
        const dayWorkouts = workouts[dateKey] || [];

        const filteredWorkouts = filter === 'all'
            ? dayWorkouts
            : dayWorkouts.filter(w => w.verification_level === filter);

        setSelectedDayWorkouts(filteredWorkouts);
    };

    const renderCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday

        const weeks = [];
        const currentWeek = [];

        for (let i = 0; i < 42; i++) { // 6 weeks * 7 days
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);

            const isCurrentMonth = date.getMonth() === month;
            const isSelected = date.toDateString() === selectedDate.toDateString();
            const isToday = date.toDateString() === new Date().toDateString();
            const hasWorkouts = workouts[date.toDateString()]?.length > 0;

            currentWeek.push(
                <TouchableOpacity
                    key={i}
                    style={[
                        styles.calendarDay,
                        isSelected && styles.selectedDay,
                        isToday && styles.today,
                    ]}
                    onPress={() => setSelectedDate(new Date(date))}
                    disabled={!isCurrentMonth}
                >
                    <Text style={[
                        styles.dayText,
                        !isCurrentMonth && styles.otherMonthText,
                        isSelected && styles.selectedDayText,
                        isToday && styles.todayText,
                    ]}>
                        {date.getDate()}
                    </Text>
                    {hasWorkouts && isCurrentMonth && (
                        <View style={styles.workoutDot} />
                    )}
                </TouchableOpacity>
            );

            if (currentWeek.length === 7) {
                weeks.push(
                    <View key={weeks.length} style={styles.calendarWeek}>
                        {currentWeek.splice(0, 7)}
                    </View>
                );
            }
        }

        return weeks;
    };

    const renderWorkoutItem = (workout: WorkoutHistoryItem) => {
        const getTypeIcon = (type: string) => {
            switch (type) {
                case 'check_in': return '✅';
                case 'tribunal': return '⚖️';
                case 'log': return '📝';
                default: return '💪';
            }
        };

        const getTypeLabel = (type: string) => {
            switch (type) {
                case 'check_in': return 'Check-in';
                case 'tribunal': return 'Tribunal';
                case 'log': return 'Logged';
                default: return 'Workout';
            }
        };

        const formatTime = (dateStr: string) => {
            return new Date(dateStr).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
            });
        };

        return (
            <View key={workout.id} style={styles.workoutItem}>
                <View style={styles.workoutHeader}>
                    <View style={styles.workoutType}>
                        <Text style={styles.typeIcon}>{getTypeIcon(workout.verification_level)}</Text>
                        <Text style={styles.typeLabel}>{getTypeLabel(workout.verification_level)}</Text>
                    </View>
                    <Text style={styles.workoutTime}>{formatTime(workout.created_at)}</Text>
                </View>

                {workout.exercise_type && (
                    <Text style={styles.exerciseName}>{workout.exercise_type}</Text>
                )}

                <View style={styles.workoutDetails}>
                    {workout.weight_kg && workout.reps && (
                        <Text style={styles.workoutStats}>
                            {workout.weight_kg}kg × {workout.reps} reps
                        </Text>
                    )}
                    <Text style={styles.points}>+{workout.points} pts</Text>
                </View>

                {workout.verification_level === 'tribunal' && (
                    <View style={styles.verificationStatus}>
                        <Text style={[
                            styles.statusText,
                            workout.is_verified ? styles.verified : styles.pending
                        ]}>
                            {workout.is_verified ? '✅ Verified' : '⏳ Pending'}
                        </Text>
                    </View>
                )}
            </View>
        );
    };

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loading}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Loading workout history...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollView}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Workout History</Text>
                    <Text style={styles.monthYear}>
                        {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </Text>
                </View>

                {/* Calendar */}
                <View style={styles.calendar}>
                    {/* Day headers */}
                    <View style={styles.dayHeaders}>
                        {dayNames.map(day => (
                            <Text key={day} style={styles.dayHeader}>{day}</Text>
                        ))}
                    </View>

                    {/* Calendar grid */}
                    {renderCalendar()}
                </View>

                {/* Filter buttons */}
                <View style={styles.filterContainer}>
                    {(['all', 'check_in', 'tribunal', 'log'] as FilterType[]).map(filterType => (
                        <TouchableOpacity
                            key={filterType}
                            style={[
                                styles.filterButton,
                                filter === filterType && styles.activeFilter
                            ]}
                            onPress={() => setFilter(filterType)}
                        >
                            <Text style={[
                                styles.filterText,
                                filter === filterType && styles.activeFilterText
                            ]}>
                                {filterType === 'all' ? 'All' :
                                 filterType === 'check_in' ? 'Check-ins' :
                                 filterType === 'tribunal' ? 'Tribunal' : 'Logged'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Selected day workouts */}
                <View style={styles.workoutsSection}>
                    <Text style={styles.sectionTitle}>
                        {selectedDate.toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </Text>

                    {selectedDayWorkouts.length > 0 ? (
                        selectedDayWorkouts.map(renderWorkoutItem)
                    ) : (
                        <View style={styles.noWorkouts}>
                            <Text style={styles.noWorkoutsText}>
                                No workouts on this day
                            </Text>
                        </View>
                    )}
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
    header: {
        padding: 20,
        alignItems: 'center',
    },
    title: {
        ...typography.headlineMedium,
        color: colors.textPrimary,
        fontWeight: '700',
    },
    monthYear: {
        ...typography.bodyLarge,
        color: colors.textSecondary,
        marginTop: 4,
    },
    calendar: {
        margin: 16,
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
    },
    dayHeaders: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    dayHeader: {
        flex: 1,
        textAlign: 'center',
        ...typography.labelMedium,
        color: colors.textMuted,
        fontWeight: '600',
    },
    calendarWeek: {
        flexDirection: 'row',
    },
    calendarDay: {
        flex: 1,
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        margin: 2,
        borderRadius: 8,
        position: 'relative',
    },
    selectedDay: {
        backgroundColor: colors.primary,
    },
    today: {
        borderWidth: 2,
        borderColor: colors.accent,
    },
    dayText: {
        ...typography.bodyMedium,
        color: colors.textPrimary,
        fontWeight: '500',
    },
    otherMonthText: {
        color: colors.textMuted,
        opacity: 0.3,
    },
    selectedDayText: {
        color: colors.background,
        fontWeight: '700',
    },
    todayText: {
        color: colors.accent,
        fontWeight: '700',
    },
    workoutDot: {
        position: 'absolute',
        bottom: 4,
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.primary,
    },
    filterContainer: {
        flexDirection: 'row',
        margin: 16,
        marginTop: 0,
    },
    filterButton: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginHorizontal: 4,
        borderRadius: 8,
        backgroundColor: colors.surface,
        alignItems: 'center',
    },
    activeFilter: {
        backgroundColor: colors.primary,
    },
    filterText: {
        ...typography.labelMedium,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    activeFilterText: {
        color: colors.background,
        fontWeight: '700',
    },
    workoutsSection: {
        margin: 16,
        marginTop: 0,
    },
    sectionTitle: {
        ...typography.bodyLarge,
        color: colors.textPrimary,
        fontWeight: '600',
        marginBottom: 12,
    },
    workoutItem: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    workoutHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    workoutType: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    typeIcon: {
        fontSize: 16,
        marginRight: 8,
    },
    typeLabel: {
        ...typography.bodyMedium,
        color: colors.textPrimary,
        fontWeight: '600',
    },
    workoutTime: {
        ...typography.labelMedium,
        color: colors.textMuted,
    },
    exerciseName: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
        marginBottom: 8,
    },
    workoutDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    workoutStats: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
    },
    points: {
        ...typography.bodyMedium,
        color: colors.primary,
        fontWeight: '600',
    },
    verificationStatus: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    statusText: {
        ...typography.labelMedium,
        fontWeight: '500',
    },
    verified: {
        color: colors.success,
    },
    pending: {
        color: colors.warning,
    },
    noWorkouts: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 32,
        alignItems: 'center',
    },
    noWorkoutsText: {
        ...typography.bodyMedium,
        color: colors.textMuted,
        textAlign: 'center',
    },
});