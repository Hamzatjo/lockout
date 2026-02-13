import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    ScrollView,
    FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '../theme';
import { supabase } from '../lib/supabase';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type WorkoutTemplate = {
    id: string;
    name: string;
    exercises: Array<{ exercise_type: string }>;
};

type Props = {
    navigation: NativeStackNavigationProp<any>;
    route: {
        params: {
            date: Date;
        };
    };
};

const TIME_SLOTS = [
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00', '20:00', '21:00', '22:00',
];

export default function CreateEventScreen({ navigation, route }: Props) {
    const { date } = route.params;
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [gymLocation, setGymLocation] = useState('');
    const [startTime, setStartTime] = useState('18:00');
    const [endTime, setEndTime] = useState('20:00');
    const [maxParticipants, setMaxParticipants] = useState('10');
    const [loading, setLoading] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState<'start' | 'end' | null>(null);
    const [workoutTemplates, setWorkoutTemplates] = useState<WorkoutTemplate[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [showTemplatePicker, setShowTemplatePicker] = useState(false);

    useEffect(() => {
        fetchWorkoutTemplates();
    }, []);

    const fetchWorkoutTemplates = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase
                .from('custom_workouts')
                .select('id, name, workout_exercises (exercise_type)')
                .eq('user_id', user.id)
                .order('name');

            if (data) {
                setWorkoutTemplates(data.map((w: any) => ({
                    id: w.id,
                    name: w.name,
                    exercises: w.workout_exercises || [],
                })));
            }
        } catch (error) {
            console.error('Error fetching templates:', error);
        }
    };

    const formatDate = (d: Date): string => {
        return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    };

    const formatTimeDisplay = (time: string): string => {
        const [hours, minutes] = time.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    };

    const handleCreateEvent = async () => {
        if (!title.trim()) {
            Alert.alert('Title Required', 'Please enter a title for your workout session');
            return;
        }

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data: membership } = await supabase
                .from('squad_members')
                .select('squad_id')
                .eq('user_id', user.id)
                .single();

            if (!membership) {
                throw new Error('You need to join a squad first!');
            }

            const { error } = await supabase.from('schedule_events').insert({
                squad_id: membership.squad_id,
                creator_id: user.id,
                title: title.trim(),
                description: description.trim() || null,
                gym_location: gymLocation.trim() || null,
                event_date: date.toISOString().split('T')[0],
                start_time: startTime,
                end_time: endTime || null,
                max_participants: parseInt(maxParticipants) || 10,
                workout_template_id: selectedTemplateId || null,
            });

            if (error) throw error;

            Alert.alert(
                '🎉 Event Created!',
                'Your workout session has been scheduled.',
                [{ text: 'Great!', onPress: () => navigation.goBack() }]
            );
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to create event');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Schedule Workout</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.form} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
                <View style={styles.dateDisplay}>
                    <Text style={styles.dateLabel}>📅</Text>
                    <Text style={styles.dateText}>{formatDate(date)}</Text>
                </View>

                <View style={styles.field}>
                    <Text style={styles.label}>Title *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g., Leg Day, Morning Cardio..."
                        placeholderTextColor={colors.textMuted}
                        value={title}
                        onChangeText={setTitle}
                        maxLength={50}
                    />
                </View>

                <View style={styles.field}>
                    <Text style={styles.label}>Workout Template (Optional)</Text>
                    <TouchableOpacity
                        style={styles.templateButton}
                        onPress={() => setShowTemplatePicker(true)}
                    >
                        <Text style={styles.templateButtonText}>
                            {selectedTemplateId 
                                ? workoutTemplates.find(t => t.id === selectedTemplateId)?.name 
                                : 'Select a workout template...'}
                        </Text>
                        <Text style={styles.templateButtonArrow}>›</Text>
                    </TouchableOpacity>
                    {selectedTemplateId && (
                        <TouchableOpacity 
                            style={styles.clearTemplateButton}
                            onPress={() => setSelectedTemplateId(null)}
                        >
                            <Text style={styles.clearTemplateText}>Clear selection</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.field}>
                    <Text style={styles.label}>Gym Location</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g., Gold's Gym Downtown"
                        placeholderTextColor={colors.textMuted}
                        value={gymLocation}
                        onChangeText={setGymLocation}
                        maxLength={100}
                    />
                </View>

                <View style={styles.field}>
                    <Text style={styles.label}>Description</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="What's the plan? Any notes for participants?"
                        placeholderTextColor={colors.textMuted}
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        maxLength={200}
                        textAlignVertical="top"
                    />
                </View>

                <View style={styles.timeRow}>
                    <View style={[styles.field, { flex: 1, marginRight: spacing.sm }]}>
                        <Text style={styles.label}>Start Time</Text>
                        <TouchableOpacity
                            style={styles.timeButton}
                            onPress={() => setShowTimePicker('start')}
                        >
                            <Text style={styles.timeButtonText}>{formatTimeDisplay(startTime)}</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={[styles.field, { flex: 1, marginLeft: spacing.sm }]}>
                        <Text style={styles.label}>End Time</Text>
                        <TouchableOpacity
                            style={styles.timeButton}
                            onPress={() => setShowTimePicker('end')}
                        >
                            <Text style={styles.timeButtonText}>{formatTimeDisplay(endTime)}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.field}>
                    <Text style={styles.label}>Max Participants</Text>
                    <TextInput
                        style={[styles.input, styles.numberInput]}
                        placeholder="10"
                        placeholderTextColor={colors.textMuted}
                        value={maxParticipants}
                        onChangeText={setMaxParticipants}
                        keyboardType="number-pad"
                        maxLength={3}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.createButton, loading && styles.buttonDisabled]}
                    onPress={handleCreateEvent}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color={colors.background} />
                    ) : (
                        <Text style={styles.createButtonText}>CREATE EVENT</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>

            {showTimePicker && (
                <View style={styles.timePickerOverlay}>
                    <TouchableOpacity 
                        style={styles.timePickerBackdrop}
                        onPress={() => setShowTimePicker(null)}
                    />
                    <View style={styles.timePickerContainer}>
                        <Text style={styles.timePickerTitle}>
                            Select {showTimePicker === 'start' ? 'Start' : 'End'} Time
                        </Text>
                        <ScrollView style={styles.timeList}>
                            {TIME_SLOTS.map(time => (
                                <TouchableOpacity
                                    key={time}
                                    style={[
                                        styles.timeOption,
                                        (showTimePicker === 'start' ? startTime : endTime) === time && styles.timeOptionSelected,
                                    ]}
                                    onPress={() => {
                                        if (showTimePicker === 'start') {
                                            setStartTime(time);
                                        } else {
                                            setEndTime(time);
                                        }
                                        setShowTimePicker(null);
                                    }}
                                >
                                    <Text style={[
                                        styles.timeOptionText,
                                        (showTimePicker === 'start' ? startTime : endTime) === time && styles.timeOptionTextSelected,
                                    ]}>
                                        {formatTimeDisplay(time)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            )}

            {showTemplatePicker && (
                <View style={styles.timePickerOverlay}>
                    <TouchableOpacity 
                        style={styles.timePickerBackdrop}
                        onPress={() => setShowTemplatePicker(false)}
                    />
                    <View style={styles.timePickerContainer}>
                        <Text style={styles.timePickerTitle}>Select Workout Template</Text>
                        {workoutTemplates.length === 0 ? (
                            <View style={styles.noTemplates}>
                                <Text style={styles.noTemplatesText}>No workout templates yet.</Text>
                                <Text style={styles.noTemplatesSubtext}>Create one in the Workouts tab!</Text>
                            </View>
                        ) : (
                            <ScrollView style={styles.timeList}>
                                {workoutTemplates.map(template => (
                                    <TouchableOpacity
                                        key={template.id}
                                        style={[
                                            styles.timeOption,
                                            selectedTemplateId === template.id && styles.timeOptionSelected,
                                        ]}
                                        onPress={() => {
                                            setSelectedTemplateId(template.id);
                                            setShowTemplatePicker(false);
                                        }}
                                    >
                                        <Text style={[
                                            styles.timeOptionText,
                                            selectedTemplateId === template.id && styles.timeOptionTextSelected,
                                        ]}>
                                            {template.name}
                                        </Text>
                                        <Text style={styles.templateExerciseCount}>
                                            {template.exercises.length} exercises
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}
                    </View>
                </View>
            )}
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
    closeButton: {
        fontSize: 24,
        color: colors.textPrimary,
    },
    headerTitle: {
        ...typography.labelLarge,
        color: colors.primary,
    },
    placeholder: {
        width: 24,
    },
    form: {
        flex: 1,
        padding: spacing.md,
    },
    dateDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.lg,
    },
    dateLabel: {
        fontSize: 24,
        marginRight: spacing.md,
    },
    dateText: {
        ...typography.bodyLarge,
        color: colors.textPrimary,
    },
    field: {
        marginBottom: spacing.md,
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
        minHeight: 100,
    },
    numberInput: {
        textAlign: 'center',
        ...typography.headlineSmall,
    },
    timeRow: {
        flexDirection: 'row',
    },
    timeButton: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        alignItems: 'center',
    },
    timeButtonText: {
        ...typography.bodyLarge,
        color: colors.primary,
        fontWeight: '600',
    },
    createButton: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.md,
        padding: spacing.lg,
        alignItems: 'center',
        marginTop: spacing.lg,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    createButtonText: {
        ...typography.labelLarge,
        color: colors.background,
        fontWeight: '700',
    },
    timePickerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'flex-end',
    },
    timePickerBackdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    timePickerContainer: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        maxHeight: '50%',
    },
    timePickerTitle: {
        ...typography.labelLarge,
        color: colors.textPrimary,
        textAlign: 'center',
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    timeList: {
        padding: spacing.md,
    },
    timeOption: {
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.xs,
    },
    timeOptionSelected: {
        backgroundColor: colors.primary,
    },
    timeOptionText: {
        ...typography.bodyMedium,
        color: colors.textPrimary,
        textAlign: 'center',
    },
    timeOptionTextSelected: {
        color: colors.background,
        fontWeight: '600',
    },
    templateButton: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    templateButtonText: {
        ...typography.bodyMedium,
        color: colors.textPrimary,
    },
    templateButtonArrow: {
        ...typography.bodyLarge,
        color: colors.textMuted,
    },
    clearTemplateButton: {
        marginTop: spacing.xs,
        alignSelf: 'flex-start',
    },
    clearTemplateText: {
        ...typography.labelSmall,
        color: colors.error,
    },
    noTemplates: {
        padding: spacing.xl,
        alignItems: 'center',
    },
    noTemplatesText: {
        ...typography.bodyMedium,
        color: colors.textMuted,
        marginBottom: spacing.xs,
    },
    noTemplatesSubtext: {
        ...typography.labelSmall,
        color: colors.textMuted,
    },
    templateExerciseCount: {
        ...typography.labelSmall,
        color: colors.textMuted,
        marginTop: spacing.xs,
    },
});
