import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    TouchableWithoutFeedback,
    Keyboard,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { colors, typography, spacing, borderRadius } from '../theme';
import { supabase } from '../lib/supabase';
import ExercisePicker from '../components/ExercisePicker';
import { Exercise, MUSCLE_GROUP_ICONS } from '../data/exercises';
import { calculate1RM } from './PRLeaderboardScreen';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Video preview component using expo-video
function VideoPreview({ uri }: { uri: string }) {
    const player = useVideoPlayer(uri, player => {
        player.loop = true;
    });

    return (
        <View style={previewStyles.videoContainer}>
            <VideoView
                player={player}
                style={previewStyles.video}
                allowsFullscreen
                contentFit="contain"
            />
        </View>
    );
}

const previewStyles = StyleSheet.create({
    videoContainer: {
        flex: 1,
        margin: 16,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#1A1A1A',
    },
    video: {
        flex: 1,
    },
});

type Props = {
    navigation: NativeStackNavigationProp<any>;
};

export default function TribunalUploadScreen({ navigation }: Props) {
    const [video, setVideo] = useState<string | null>(null);
    const [caption, setCaption] = useState('');
    const [loading, setLoading] = useState(false);
    const [isPR, setIsPR] = useState(false);
    const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
    const [weight, setWeight] = useState('');
    const [reps, setReps] = useState('');
    const [showExercisePicker, setShowExercisePicker] = useState(false);

    const pickVideo = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['videos'],
            allowsEditing: true,
            videoMaxDuration: 60, // 60 second limit
            quality: 0.7,
        });

        if (!result.canceled && result.assets[0]) {
            setVideo(result.assets[0].uri);
        }
    };

    const recordVideo = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Camera access is required to record video');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['videos'],
            videoMaxDuration: 60,
            quality: 0.7,
        });

        if (!result.canceled && result.assets[0]) {
            setVideo(result.assets[0].uri);
        }
    };

    const submitTribunal = async () => {
        if (!video) return;
        
        if (isPR) {
            if (!selectedExercise) {
                Alert.alert('Exercise Required', 'Select an exercise for your PR claim');
                return;
            }
            if (!weight || parseFloat(weight) <= 0) {
                Alert.alert('Weight Required', 'Enter the weight you lifted (in kg)');
                return;
            }
            if (!reps || parseInt(reps) <= 0) {
                Alert.alert('Reps Required', 'Enter how many reps you completed');
                return;
            }
        }
        
        if (!caption.trim()) {
            Alert.alert('Caption Required', 'Describe your lift for the tribunal');
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

            const fileName = `${user.id}/tribunal_${Date.now()}.mp4`;

            const base64Data = await FileSystem.readAsStringAsync(video, {
                encoding: 'base64',
            });

            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            const { error: uploadError } = await supabase.storage
                .from('workouts')
                .upload(fileName, bytes, {
                    contentType: 'video/mp4',
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('workouts')
                .getPublicUrl(fileName);

            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 48);

            const workoutData: any = {
                user_id: user.id,
                squad_id: membership.squad_id,
                verification_level: 'tribunal',
                media_url: publicUrl,
                thumbnail_url: publicUrl,
                caption: `${isPR ? '🏆 PR CLAIM: ' : ''}${caption}`,
                expires_at: expiresAt.toISOString(),
                points: 0,
            };

            if (isPR && selectedExercise) {
                workoutData.exercise_type = selectedExercise.id;
                workoutData.weight_kg = parseFloat(weight);
                workoutData.reps = parseInt(reps);
            }

            const { error: insertError } = await supabase.from('workouts').insert(workoutData);

            if (insertError) throw insertError;

            Alert.alert(
                '⚖️ Submitted to Tribunal!',
                'Your squad will vote on this lift. Good luck!',
                [{ text: 'Face the Judgment', onPress: () => navigation.goBack() }]
            );
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to submit to tribunal');
        } finally {
            setLoading(false);
        }
    };

    // Video selection screen
    if (!video) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text style={styles.closeButton}>✕</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>THE TRIBUNAL</Text>
                    <View style={styles.placeholder} />
                </View>

                <View style={styles.content}>
                    <Text style={styles.tribunalEmoji}>⚖️</Text>
                    <Text style={styles.title}>Face the Tribunal</Text>
                    <Text style={styles.subtitle}>
                        Upload video evidence of your lift.{'\n'}
                        Your squad will judge if it counts.
                    </Text>

                    <View style={styles.uploadOptions}>
                        <TouchableOpacity style={styles.uploadButton} onPress={recordVideo}>
                            <Text style={styles.uploadEmoji}>🎬</Text>
                            <Text style={styles.uploadText}>RECORD NOW</Text>
                            <Text style={styles.uploadSubtext}>Max 60 seconds</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.uploadButtonSecondary} onPress={pickVideo}>
                            <Text style={styles.uploadEmoji}>📁</Text>
                            <Text style={styles.uploadTextSecondary}>FROM GALLERY</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.rules}>
                        <Text style={styles.rulesTitle}>⚠️ TRIBUNAL RULES</Text>
                        <Text style={styles.rulesText}>• Show full range of motion</Text>
                        <Text style={styles.rulesText}>• Clear camera angle</Text>
                        <Text style={styles.rulesText}>• Squad majority decides VALID or CAP</Text>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    // Video review screen
    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                <View style={{ flex: 1 }}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => setVideo(null)}>
                            <Text style={styles.backButton}>← Back</Text>
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>REVIEW</Text>
                        <View style={styles.placeholder} />
                    </View>

                    <VideoPreview uri={video} />

                    <ScrollView style={styles.formContainer} contentContainerStyle={{ gap: spacing.md }}>
                        <TouchableOpacity
                            style={[styles.prToggle, isPR && styles.prToggleActive]}
                            onPress={() => setIsPR(!isPR)}
                        >
                            <Text style={styles.prToggleEmoji}>🏆</Text>
                            <Text style={[styles.prToggleText, isPR && styles.prToggleTextActive]}>
                                This is a PR
                            </Text>
                            <View style={[styles.prCheckbox, isPR && styles.prCheckboxActive]}>
                                {isPR && <Text style={styles.prCheck}>✓</Text>}
                            </View>
                        </TouchableOpacity>

                        {isPR && (
                            <View style={styles.prDetailsContainer}>
                                <TouchableOpacity
                                    style={styles.exerciseButton}
                                    onPress={() => setShowExercisePicker(true)}
                                >
                                    <Text style={styles.exerciseIcon}>
                                        {selectedExercise ? MUSCLE_GROUP_ICONS[selectedExercise.muscleGroup] : '🏋️'}
                                    </Text>
                                    <Text style={styles.exerciseButtonText}>
                                        {selectedExercise ? selectedExercise.name : 'Select Exercise'}
                                    </Text>
                                    <Text style={styles.chevron}>›</Text>
                                </TouchableOpacity>

                                <View style={styles.weightRepsRow}>
                                    <View style={styles.inputHalf}>
                                        <Text style={styles.inputLabel}>Weight (kg)</Text>
                                        <TextInput
                                            style={styles.numberInput}
                                            placeholder="0"
                                            placeholderTextColor={colors.textMuted}
                                            value={weight}
                                            onChangeText={setWeight}
                                            keyboardType="decimal-pad"
                                        />
                                    </View>
                                    <View style={styles.inputHalf}>
                                        <Text style={styles.inputLabel}>Reps</Text>
                                        <TextInput
                                            style={styles.numberInput}
                                            placeholder="0"
                                            placeholderTextColor={colors.textMuted}
                                            value={reps}
                                            onChangeText={setReps}
                                            keyboardType="number-pad"
                                        />
                                    </View>
                                </View>

                                {weight && reps && parseFloat(weight) > 0 && parseInt(reps) > 0 && (
                                    <View style={styles.estimatedPR}>
                                        <Text style={styles.estimatedPRLabel}>Estimated 1RM:</Text>
                                        <Text style={styles.estimatedPRValue}>
                                            {calculate1RM(parseFloat(weight), parseInt(reps))} kg
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}

                        <TextInput
                            style={styles.captionInput}
                            placeholder={isPR ? "Add notes (e.g., 'Felt easy, could do more')" : "Describe your lift (e.g., 225lb Bench x 5)"}
                            placeholderTextColor={colors.textMuted}
                            value={caption}
                            onChangeText={setCaption}
                            multiline
                            maxLength={200}
                        />

                        <TouchableOpacity
                            style={[styles.submitButton, loading && styles.buttonDisabled]}
                            onPress={submitTribunal}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={colors.background} />
                            ) : (
                                <>
                                    <Text style={styles.submitEmoji}>⚖️</Text>
                                    <Text style={styles.submitText}>SUBMIT TO TRIBUNAL</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </ScrollView>

                    <ExercisePicker
                        visible={showExercisePicker}
                        onSelect={(exercise) => {
                            setSelectedExercise(exercise);
                            setShowExercisePicker(false);
                        }}
                        onClose={() => setShowExercisePicker(false)}
                    />
                </View>
            </TouchableWithoutFeedback>
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
    backButton: {
        ...typography.bodyLarge,
        color: colors.primary,
    },
    headerTitle: {
        ...typography.labelLarge,
        color: colors.accent,
    },
    placeholder: {
        width: 50,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    tribunalEmoji: {
        fontSize: 64,
        marginBottom: spacing.lg,
    },
    title: {
        ...typography.displaySmall,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    subtitle: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.xl,
    },
    uploadOptions: {
        width: '100%',
        gap: spacing.md,
        marginBottom: spacing.xl,
    },
    uploadButton: {
        backgroundColor: colors.accent,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        alignItems: 'center',
    },
    uploadButtonSecondary: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    uploadEmoji: {
        fontSize: 32,
        marginBottom: spacing.xs,
    },
    uploadText: {
        ...typography.labelLarge,
        color: colors.textPrimary,
    },
    uploadTextSecondary: {
        ...typography.labelLarge,
        color: colors.textSecondary,
    },
    uploadSubtext: {
        ...typography.labelSmall,
        color: colors.textPrimary,
        opacity: 0.7,
        marginTop: spacing.xs,
    },
    rules: {
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        width: '100%',
    },
    rulesTitle: {
        ...typography.labelMedium,
        color: colors.warning,
        marginBottom: spacing.sm,
    },
    rulesText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },
    // Video review styles
    videoContainer: {
        flex: 1,
        margin: spacing.md,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        backgroundColor: colors.surface,
    },
    video: {
        flex: 1,
    },
    formContainer: {
        padding: spacing.md,
        gap: spacing.md,
    },
    prToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    prToggleActive: {
        borderColor: colors.warning,
        backgroundColor: colors.warning + '10',
    },
    prToggleEmoji: {
        fontSize: 24,
        marginRight: spacing.md,
    },
    prToggleText: {
        ...typography.bodyLarge,
        color: colors.textSecondary,
        flex: 1,
    },
    prToggleTextActive: {
        color: colors.warning,
        fontWeight: '600',
    },
    prCheckbox: {
        width: 24,
        height: 24,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    prCheckboxActive: {
        backgroundColor: colors.warning,
        borderColor: colors.warning,
    },
    prCheck: {
        color: colors.background,
        fontWeight: '700',
    },
    captionInput: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        color: colors.textPrimary,
        ...typography.bodyLarge,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    submitButton: {
        backgroundColor: colors.accent,
        borderRadius: borderRadius.md,
        padding: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    submitEmoji: {
        fontSize: 24,
    },
    submitText: {
        ...typography.labelLarge,
        color: colors.textPrimary,
    },
    prDetailsContainer: {
        gap: spacing.md,
    },
    exerciseButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    exerciseIcon: {
        fontSize: 24,
        marginRight: spacing.md,
    },
    exerciseButtonText: {
        ...typography.bodyLarge,
        color: colors.textPrimary,
        flex: 1,
    },
    chevron: {
        fontSize: 20,
        color: colors.textMuted,
    },
    weightRepsRow: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    inputHalf: {
        flex: 1,
    },
    inputLabel: {
        ...typography.labelSmall,
        color: colors.textMuted,
        marginBottom: spacing.xs,
    },
    numberInput: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        color: colors.textPrimary,
        ...typography.headlineMedium,
        textAlign: 'center',
    },
    estimatedPR: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary + '20',
        padding: spacing.md,
        borderRadius: borderRadius.md,
        gap: spacing.sm,
    },
    estimatedPRLabel: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
    },
    estimatedPRValue: {
        ...typography.headlineMedium,
        color: colors.primary,
        fontWeight: '700',
    },
});
