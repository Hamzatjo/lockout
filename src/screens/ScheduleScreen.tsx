import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Alert,
    Modal,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '../theme';
import { supabase, Database } from '../lib/supabase';
import { getExerciseName, MUSCLE_GROUP_ICONS } from '../data/exercises';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type ScheduleEvent = Database['public']['Tables']['schedule_events']['Row'] & {
    profiles: { username: string } | null;
    participant_count: number;
    user_status: 'joined' | 'pending' | 'declined' | null;
    custom_workouts: { name: string } | null;
};

type WorkoutLog = {
    id: string;
    user_id: string;
    logged_at: string;
    duration_minutes: number | null;
    notes: string | null;
    custom_workouts: { name: string } | null;
    profiles: { username: string } | null;
    exercise_logs: Array<{
        exercise_type: string;
        set_number: number;
        weight_kg: number | null;
        reps: number | null;
    }>;
};

type Props = {
    navigation: NativeStackNavigationProp<any>;
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 
                'July', 'August', 'September', 'October', 'November', 'December'];

export default function ScheduleScreen({ navigation }: Props) {
    const [events, setEvents] = useState<ScheduleEvent[]>([]);
    const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [selectedLog, setSelectedLog] = useState<WorkoutLog | null>(null);

    useEffect(() => {
        fetchEvents();
    }, [currentDate]);

    const fetchEvents = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setCurrentUserId(user.id);

            const { data: membership } = await supabase
                .from('squad_members')
                .select('squad_id')
                .eq('user_id', user.id)
                .single();

            if (!membership) {
                setLoading(false);
                return;
            }

            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0);

            const { data: eventsData } = await supabase
                .from('schedule_events')
                .select(`
                    *,
                    profiles:creator_id (username),
                    event_participants (user_id, status),
                    custom_workouts (name)
                `)
                .eq('squad_id', membership.squad_id)
                .gte('event_date', startDate.toISOString().split('T')[0])
                .lte('event_date', endDate.toISOString().split('T')[0])
                .order('event_date', { ascending: true })
                .order('start_time', { ascending: true });

            const { data: squadMembers } = await supabase
                .from('squad_members')
                .select('user_id')
                .eq('squad_id', membership.squad_id);

            const memberIds = squadMembers?.map(m => m.user_id) || [];

            let logsData: any[] = [];
            if (memberIds.length > 0) {
                const { data } = await supabase
                    .from('workout_logs')
                    .select(`
                        id,
                        user_id,
                        logged_at,
                        duration_minutes,
                        notes,
                        custom_workouts (name),
                        profiles (username),
                        exercise_logs (
                            exercise_type,
                            set_number,
                            weight_kg,
                            reps
                        )
                    `)
                    .in('user_id', memberIds)
                    .gte('logged_at', startDate.toISOString())
                    .lte('logged_at', endDate.toISOString() + 'T23:59:59')
                    .order('logged_at', { ascending: false });
                logsData = data || [];
            }

            if (eventsData) {
                const processed: ScheduleEvent[] = eventsData.map((e: any) => {
                    const participants = e.event_participants || [];
                    const userParticipation = participants.find((p: any) => p.user_id === user.id);
                    
                    return {
                        ...e,
                        profiles: e.profiles,
                        participant_count: participants.filter((p: any) => p.status === 'joined').length,
                        user_status: userParticipation?.status || null,
                        custom_workouts: Array.isArray(e.custom_workouts) ? e.custom_workouts[0] : e.custom_workouts,
                    };
                });
                setEvents(processed);
            }

            if (logsData) {
                const processedLogs: WorkoutLog[] = logsData.map((log: any) => ({
                    ...log,
                    custom_workouts: Array.isArray(log.custom_workouts) ? log.custom_workouts[0] : log.custom_workouts,
                    profiles: Array.isArray(log.profiles) ? log.profiles[0] : log.profiles,
                }));
                setWorkoutLogs(processedLogs);
            }
        } catch (error) {
            console.error('Error fetching events:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchEvents();
    };

    const isSameDay = (date1: Date, date2: Date): boolean => {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    };

    const calendarDays = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days: { date: Date; isCurrentMonth: boolean; hasEvents: boolean; hasLogs: boolean }[] = [];

        const prevMonth = new Date(year, month, 0);
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            const date = new Date(year, month - 1, prevMonth.getDate() - i);
            days.push({ date, isCurrentMonth: false, hasEvents: false, hasLogs: false });
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateStr = date.toISOString().split('T')[0];
            const hasEvents = events.some(e => e.event_date === dateStr);
            const hasLogs = workoutLogs.some(l => {
                const logDate = new Date(l.logged_at);
                return isSameDay(logDate, date);
            });
            days.push({ date, isCurrentMonth: true, hasEvents, hasLogs });
        }

        const remainingDays = 42 - days.length;
        for (let day = 1; day <= remainingDays; day++) {
            const date = new Date(year, month + 1, day);
            days.push({ date, isCurrentMonth: false, hasEvents: false, hasLogs: false });
        }

        return days;
    }, [currentDate, events, workoutLogs]);

    const selectedDateEvents = useMemo(() => {
        const dateStr = selectedDate.toISOString().split('T')[0];
        return events.filter(e => e.event_date === dateStr);
    }, [selectedDate, events]);

    const selectedDateLogs = useMemo(() => {
        return workoutLogs.filter(l => {
            const logDate = new Date(l.logged_at);
            return isSameDay(logDate, selectedDate);
        });
    }, [selectedDate, workoutLogs]);

    const goToPrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const isToday = (date: Date): boolean => {
        return isSameDay(date, new Date());
    };

    const formatTime = (time: string): string => {
        const [hours, minutes] = time.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    };

    const handleJoinEvent = async (event: ScheduleEvent) => {
        if (!currentUserId) return;

        try {
            if (event.user_status) {
                const { error } = await supabase
                    .from('event_participants')
                    .delete()
                    .eq('event_id', event.id)
                    .eq('user_id', currentUserId);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('event_participants')
                    .insert({
                        event_id: event.id,
                        user_id: currentUserId,
                        status: 'joined',
                    });

                if (error) throw error;
            }

            fetchEvents();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update participation');
        }
    };

    const renderCalendarDay = ({ item }: { item: { date: Date; isCurrentMonth: boolean; hasEvents: boolean; hasLogs: boolean } }) => {
        const isSelected = isSameDay(item.date, selectedDate);
        const today = isToday(item.date);

        return (
            <TouchableOpacity
                style={[
                    styles.dayCell,
                    !item.isCurrentMonth && styles.dayCellOtherMonth,
                    isSelected && styles.dayCellSelected,
                ]}
                onPress={() => setSelectedDate(item.date)}
            >
                <Text style={[
                    styles.dayNumber,
                    !item.isCurrentMonth && styles.dayNumberOther,
                    today && styles.dayNumberToday,
                    isSelected && styles.dayNumberSelected,
                ]}>
                    {item.date.getDate()}
                </Text>
                <View style={styles.dayIndicators}>
                    {item.hasEvents && (
                        <View style={[styles.eventDot, isSelected && styles.eventDotSelected]} />
                    )}
                    {item.hasLogs && (
                        <View style={[styles.logDot, isSelected && styles.logDotSelected]} />
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const renderEvent = ({ item }: { item: ScheduleEvent }) => {
        const isFull = item.participant_count >= item.max_participants;
        const isJoined = item.user_status === 'joined';

        return (
            <TouchableOpacity 
                style={styles.eventCard}
                onPress={() => {
                    if (isJoined) {
                        navigation.navigate('ActiveWorkout', { 
                            workout: item.custom_workouts ? { 
                                name: item.custom_workouts.name,
                                exercises: []
                            } : null,
                            scheduleEventId: item.id 
                        });
                    }
                }}
            >
                <View style={styles.eventHeader}>
                    <View style={styles.eventTimeContainer}>
                        <Text style={styles.eventTime}>{formatTime(item.start_time)}</Text>
                        {item.end_time && (
                            <Text style={styles.eventTimeEnd}>- {formatTime(item.end_time)}</Text>
                        )}
                    </View>
                    <View style={[
                        styles.joinBadge,
                        item.user_status === 'joined' && styles.joinBadgeJoined,
                        item.user_status === 'declined' && styles.joinBadgeDeclined,
                    ]}>
                        <Text style={[
                            styles.joinBadgeText,
                            item.user_status === 'joined' && styles.joinBadgeTextJoined,
                        ]}>
                            {item.participant_count}/{item.max_participants}
                        </Text>
                    </View>
                </View>

                <Text style={styles.eventTitle}>{item.title}</Text>
                
                {item.custom_workouts && (
                    <View style={styles.templateBadge}>
                        <Text style={styles.templateBadgeText}>📋 {item.custom_workouts.name}</Text>
                    </View>
                )}
                
                {item.gym_location && (
                    <Text style={styles.eventLocation}>📍 {item.gym_location}</Text>
                )}
                
                {item.description && (
                    <Text style={styles.eventDescription}>{item.description}</Text>
                )}

                <View style={styles.eventFooter}>
                    <Text style={styles.eventCreator}>
                        by {item.profiles?.username || 'Unknown'}
                    </Text>
                    
                    {isJoined ? (
                        <TouchableOpacity
                            style={styles.startWorkoutButton}
                            onPress={() => navigation.navigate('ActiveWorkout', { 
                                workout: item.custom_workouts ? { 
                                    name: item.custom_workouts.name,
                                    exercises: []
                                } : null,
                                scheduleEventId: item.id 
                            })}
                        >
                            <Text style={styles.startWorkoutButtonText}>START</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={[
                                styles.joinButton,
                                isFull && styles.joinButtonDisabled,
                            ]}
                            onPress={() => handleJoinEvent(item)}
                            disabled={isFull}
                        >
                            <Text style={styles.joinButtonText}>
                                {isFull ? 'Full' : 'Join'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const renderWorkoutLog = ({ item }: { item: WorkoutLog }) => {
        const isOwn = item.user_id === currentUserId;
        const exerciseCounts: Record<string, number> = {};
        item.exercise_logs?.forEach(log => {
            exerciseCounts[log.exercise_type] = (exerciseCounts[log.exercise_type] || 0) + 1;
        });
        const totalSets = item.exercise_logs?.length || 0;

        return (
            <TouchableOpacity 
                style={[styles.logCard, isOwn && styles.logCardOwn]}
                onPress={() => setSelectedLog(item)}
            >
                <View style={styles.logHeader}>
                    <View style={styles.logUser}>
                        <Text style={styles.logEmoji}>💪</Text>
                        <Text style={styles.logUsername}>{item.profiles?.username || 'Unknown'}</Text>
                        {isOwn && <Text style={styles.ownBadge}>YOU</Text>}
                    </View>
                    <Text style={styles.logTime}>
                        {new Date(item.logged_at).toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit' 
                        })}
                    </Text>
                </View>

                <Text style={styles.logWorkoutName}>
                    {item.custom_workouts?.name || 'Quick Workout'}
                </Text>

                <View style={styles.logStats}>
                    <Text style={styles.logStat}>{totalSets} sets</Text>
                    {item.duration_minutes && (
                        <Text style={styles.logStat}>• {item.duration_minutes} min</Text>
                    )}
                </View>

                <View style={styles.logExercises}>
                    {Object.entries(exerciseCounts).slice(0, 3).map(([exercise, count]) => (
                        <View key={exercise} style={styles.exerciseTag}>
                            <Text style={styles.exerciseTagText}>
                                {getExerciseName(exercise)} ×{count}
                            </Text>
                        </View>
                    ))}
                    {Object.keys(exerciseCounts).length > 3 && (
                        <Text style={styles.moreExercises}>
                            +{Object.keys(exerciseCounts).length - 3} more
                        </Text>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const renderLogDetailModal = () => {
        if (!selectedLog) return null;

        const exerciseGroups: Record<string, typeof selectedLog.exercise_logs> = {};
        selectedLog.exercise_logs?.forEach(log => {
            if (!exerciseGroups[log.exercise_type]) {
                exerciseGroups[log.exercise_type] = [];
            }
            exerciseGroups[log.exercise_type].push(log);
        });

        return (
            <Modal
                visible={!!selectedLog}
                transparent
                animationType="slide"
                onRequestClose={() => setSelectedLog(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {selectedLog.custom_workouts?.name || 'Quick Workout'}
                            </Text>
                            <TouchableOpacity onPress={() => setSelectedLog(null)}>
                                <Text style={styles.modalClose}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalMeta}>
                            <Text style={styles.modalUser}>
                                {selectedLog.profiles?.username}
                            </Text>
                            <Text style={styles.modalDate}>
                                {new Date(selectedLog.logged_at).toLocaleString()}
                            </Text>
                            {selectedLog.duration_minutes && (
                                <Text style={styles.modalDuration}>
                                    {selectedLog.duration_minutes} min
                                </Text>
                            )}
                        </View>

                        <ScrollView style={styles.modalExercises}>
                            {Object.entries(exerciseGroups).map(([exerciseType, sets]) => (
                                <View key={exerciseType} style={styles.modalExercise}>
                                    <Text style={styles.modalExerciseName}>
                                        {getExerciseName(exerciseType)}
                                    </Text>
                                    {sets.map((set, idx) => (
                                        <View key={idx} style={styles.modalSet}>
                                            <Text style={styles.modalSetNumber}>Set {set.set_number}</Text>
                                            <Text style={styles.modalSetData}>
                                                {set.weight_kg ? `${set.weight_kg} kg` : ''} 
                                                {set.weight_kg && set.reps ? ' × ' : ''}
                                                {set.reps ? `${set.reps} reps` : ''}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            ))}
                        </ScrollView>

                        {selectedLog.notes && (
                            <View style={styles.modalNotes}>
                                <Text style={styles.modalNotesLabel}>Notes</Text>
                                <Text style={styles.modalNotesText}>{selectedLog.notes}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
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
                <TouchableOpacity onPress={goToPrevMonth}>
                    <Text style={styles.navArrow}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.monthTitle}>
                    {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                </Text>
                <TouchableOpacity onPress={goToNextMonth}>
                    <Text style={styles.navArrow}>›</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.daysHeader}>
                {DAYS.map(day => (
                    <Text key={day} style={styles.dayName}>{day}</Text>
                ))}
            </View>

            <FlatList
                data={calendarDays}
                renderItem={renderCalendarDay}
                keyExtractor={(_, index) => index.toString()}
                numColumns={7}
                scrollEnabled={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                    />
                }
            />

            <View style={styles.eventsSection}>
                <View style={styles.eventsHeader}>
                    <Text style={styles.eventsTitle}>
                        {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </Text>
                    <View style={styles.headerButtons}>
                        <TouchableOpacity
                            style={styles.quickLogButton}
                            onPress={() => navigation.navigate('ActiveWorkout', {})}
                        >
                            <Text style={styles.quickLogButtonText}>▶ Start</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={() => navigation.navigate('CreateEvent', { date: selectedDate })}
                        >
                            <Text style={styles.addButtonText}>+ Add</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <ScrollView style={styles.eventsList} showsVerticalScrollIndicator={false}>
                    {selectedDateLogs.length > 0 && (
                        <View style={styles.sectionContainer}>
                            <Text style={styles.sectionLabel}>Completed Workouts</Text>
                            {selectedDateLogs.map(log => (
                                <View key={log.id}>{renderWorkoutLog({ item: log })}</View>
                            ))}
                        </View>
                    )}

                    {selectedDateEvents.length > 0 && (
                        <View style={styles.sectionContainer}>
                            <Text style={styles.sectionLabel}>Scheduled</Text>
                            {selectedDateEvents.map(event => (
                                <View key={event.id}>{renderEvent({ item: event })}</View>
                            ))}
                        </View>
                    )}

                    {selectedDateEvents.length === 0 && selectedDateLogs.length === 0 && (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyEmoji}>📅</Text>
                            <Text style={styles.emptyTitle}>No activity</Text>
                            <Text style={styles.emptyText}>
                                Start a workout or schedule a session!
                            </Text>
                            <TouchableOpacity
                                style={styles.emptyStartButton}
                                onPress={() => navigation.navigate('ActiveWorkout', {})}
                            >
                                <Text style={styles.emptyStartButtonText}>Start Workout</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            </View>

            {renderLogDetailModal()}
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
    navArrow: {
        fontSize: 28,
        color: colors.primary,
        fontWeight: '300',
    },
    monthTitle: {
        ...typography.headlineSmall,
        color: colors.textPrimary,
    },
    daysHeader: {
        flexDirection: 'row',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    dayName: {
        flex: 1,
        textAlign: 'center',
        ...typography.labelSmall,
        color: colors.textMuted,
    },
    dayCell: {
        flex: 1,
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xs,
    },
    dayCellOtherMonth: {
        opacity: 0.3,
    },
    dayCellSelected: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.full,
    },
    dayNumber: {
        ...typography.bodyMedium,
        color: colors.textPrimary,
    },
    dayNumberOther: {
        color: colors.textMuted,
    },
    dayNumberToday: {
        color: colors.primary,
        fontWeight: '700',
    },
    dayNumberSelected: {
        color: colors.background,
        fontWeight: '700',
    },
    eventDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.accent,
        marginTop: 2,
    },
    eventDotSelected: {
        backgroundColor: colors.background,
    },
    eventsSection: {
        flex: 1,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    eventsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    eventsTitle: {
        ...typography.labelMedium,
        color: colors.textPrimary,
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
    eventsList: {
        flex: 1,
        padding: spacing.md,
    },
    eventCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    eventHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    eventTimeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    eventTime: {
        ...typography.labelMedium,
        color: colors.primary,
    },
    eventTimeEnd: {
        ...typography.labelSmall,
        color: colors.textMuted,
        marginLeft: spacing.xs,
    },
    joinBadge: {
        backgroundColor: colors.surfaceLight,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.sm,
    },
    joinBadgeJoined: {
        backgroundColor: colors.primary + '30',
    },
    joinBadgeDeclined: {
        backgroundColor: colors.error + '30',
    },
    joinBadgeText: {
        ...typography.labelSmall,
        color: colors.textMuted,
    },
    joinBadgeTextJoined: {
        color: colors.primary,
    },
    eventTitle: {
        ...typography.headlineSmall,
        color: colors.textPrimary,
        marginTop: spacing.sm,
    },
    eventLocation: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    eventDescription: {
        ...typography.bodySmall,
        color: colors.textMuted,
        marginTop: spacing.xs,
    },
    eventFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: spacing.md,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    eventCreator: {
        ...typography.labelSmall,
        color: colors.textMuted,
    },
    joinButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
    },
    leaveButton: {
        backgroundColor: colors.surfaceLight,
    },
    joinButtonDisabled: {
        opacity: 0.5,
    },
    joinButtonText: {
        ...typography.labelSmall,
        color: colors.background,
        fontWeight: '600',
    },
    leaveButtonText: {
        color: colors.textPrimary,
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
    headerButtons: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    quickLogButton: {
        backgroundColor: colors.success,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
    },
    quickLogButtonText: {
        ...typography.labelSmall,
        color: colors.background,
        fontWeight: '700',
    },
    dayIndicators: {
        flexDirection: 'row',
        gap: 3,
        marginTop: 2,
    },
    logDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.success,
    },
    logDotSelected: {
        backgroundColor: colors.background,
    },
    sectionContainer: {
        marginBottom: spacing.md,
    },
    sectionLabel: {
        ...typography.labelSmall,
        color: colors.textMuted,
        marginBottom: spacing.sm,
        letterSpacing: 1,
    },
    templateBadge: {
        backgroundColor: colors.surfaceLight,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.sm,
        alignSelf: 'flex-start',
        marginTop: spacing.xs,
    },
    templateBadgeText: {
        ...typography.labelSmall,
        color: colors.textSecondary,
    },
    startWorkoutButton: {
        backgroundColor: colors.success,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
    },
    startWorkoutButtonText: {
        ...typography.labelSmall,
        color: colors.background,
        fontWeight: '700',
    },
    logCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    logCardOwn: {
        borderLeftWidth: 3,
        borderLeftColor: colors.success,
    },
    logHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    logUser: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logEmoji: {
        fontSize: 16,
        marginRight: spacing.xs,
    },
    logUsername: {
        ...typography.labelMedium,
        color: colors.textPrimary,
    },
    ownBadge: {
        ...typography.labelSmall,
        color: colors.success,
        marginLeft: spacing.sm,
        fontWeight: '700',
    },
    logTime: {
        ...typography.labelSmall,
        color: colors.textMuted,
    },
    logWorkoutName: {
        ...typography.headlineSmall,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    logStats: {
        flexDirection: 'row',
        marginBottom: spacing.sm,
    },
    logStat: {
        ...typography.labelSmall,
        color: colors.textMuted,
    },
    logExercises: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.xs,
    },
    exerciseTag: {
        backgroundColor: colors.surfaceLight,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.sm,
    },
    exerciseTagText: {
        ...typography.labelSmall,
        color: colors.textSecondary,
    },
    moreExercises: {
        ...typography.labelSmall,
        color: colors.textMuted,
        alignSelf: 'center',
    },
    emptyStartButton: {
        backgroundColor: colors.success,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        marginTop: spacing.md,
    },
    emptyStartButtonText: {
        ...typography.labelMedium,
        color: colors.background,
        fontWeight: '700',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalTitle: {
        ...typography.headlineMedium,
        color: colors.textPrimary,
        flex: 1,
    },
    modalClose: {
        fontSize: 24,
        color: colors.textMuted,
        padding: spacing.sm,
    },
    modalMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalUser: {
        ...typography.labelMedium,
        color: colors.primary,
    },
    modalDate: {
        ...typography.labelSmall,
        color: colors.textMuted,
    },
    modalDuration: {
        ...typography.labelSmall,
        color: colors.success,
    },
    modalExercises: {
        padding: spacing.md,
        maxHeight: 300,
    },
    modalExercise: {
        marginBottom: spacing.md,
    },
    modalExerciseName: {
        ...typography.bodyLarge,
        color: colors.textPrimary,
        fontWeight: '600',
        marginBottom: spacing.xs,
    },
    modalSet: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: spacing.xs,
        paddingLeft: spacing.md,
    },
    modalSetNumber: {
        ...typography.bodySmall,
        color: colors.textMuted,
    },
    modalSetData: {
        ...typography.bodySmall,
        color: colors.textPrimary,
    },
    modalNotes: {
        padding: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    modalNotesLabel: {
        ...typography.labelSmall,
        color: colors.textMuted,
        marginBottom: spacing.xs,
    },
    modalNotesText: {
        ...typography.bodyMedium,
        color: colors.textPrimary,
    },
});
