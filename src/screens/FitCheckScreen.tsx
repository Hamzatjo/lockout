// LOCKOUT Fit Check Screen (BeReal-style Camera)

import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    Image,
    TouchableWithoutFeedback,
    Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { colors, typography, spacing, borderRadius } from '../theme';
import { supabase } from '../lib/supabase';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Quick caption options
const CAPTION_OPTIONS = [
    { emoji: '🦵', label: 'Leg Day' },
    { emoji: '💪', label: 'Push Day' },
    { emoji: '🔙', label: 'Pull Day' },
    { emoji: '🏃', label: 'Cardio' },
    { emoji: '🏋️', label: 'Full Body' },
    { emoji: '🔥', label: 'Just Vibin' },
];

type Props = {
    navigation: NativeStackNavigationProp<any>;
};

export default function FitCheckScreen({ navigation }: Props) {
    const [facing, setFacing] = useState<CameraType>('front');
    const [permission, requestPermission] = useCameraPermissions();
    const [photo, setPhoto] = useState<string | null>(null);
    const [caption, setCaption] = useState('');
    const [loading, setLoading] = useState(false);
    const cameraRef = useRef<CameraView>(null);

    // Request permission on mount
    useEffect(() => {
        if (!permission?.granted) {
            requestPermission();
        }
    }, []);

    const takePicture = async () => {
        if (!cameraRef.current) return;

        try {
            const result = await cameraRef.current.takePictureAsync({
                quality: 0.7,
                base64: true, // Get base64 for upload
            });
            if (result?.uri) {
                setPhoto(result.uri);
                // Store base64 if available
                if (result.base64) {
                    (global as any).__lastPhotoBase64 = result.base64;
                }
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to take picture');
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.7,
        });

        if (!result.canceled && result.assets[0]) {
            setPhoto(result.assets[0].uri);
        }
    };

    const toggleCamera = () => {
        setFacing(current => (current === 'back' ? 'front' : 'back'));
    };

    const retake = () => {
        setPhoto(null);
    };

    const submitCheckIn = async () => {
        if (!photo) return;

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Get user's squad
            const { data: membership } = await supabase
                .from('squad_members')
                .select('squad_id')
                .eq('user_id', user.id)
                .single();

            if (!membership) {
                throw new Error('You need to join a squad first!');
            }

            // Upload image to Supabase Storage
            const fileName = `${user.id}/${Date.now()}.jpg`;

            // Use stored base64 or read from URI
            let base64Data = (global as any).__lastPhotoBase64;
            if (!base64Data) {
                // Fallback: For gallery images, we need to read differently
                const response = await fetch(photo);
                const blob = await response.blob();
                base64Data = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const result = reader.result as string;
                        resolve(result.split(',')[1]); // Remove data:image/jpeg;base64, prefix
                    };
                    reader.readAsDataURL(blob);
                });
            }

            // Decode base64 to Uint8Array
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('workouts')
                .upload(fileName, bytes, {
                    contentType: 'image/jpeg',
                });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('workouts')
                .getPublicUrl(fileName);

            // Create workout record (24h expiry for check-ins)
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24);

            const { error: insertError } = await supabase.from('workouts').insert({
                user_id: user.id,
                squad_id: membership.squad_id,
                verification_level: 'check_in',
                media_url: publicUrl,
                thumbnail_url: publicUrl, // Same as media for images
                caption: caption || 'Checked in 💪',
                expires_at: expiresAt.toISOString(),
                points: 1, // Auto-approved, low points
            });

            if (insertError) throw insertError;

            Alert.alert('✅ Fit Check Posted!', 'Your squad can see you showed up.', [
                { text: 'Nice!', onPress: () => navigation.goBack() },
            ]);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to post check-in');
        } finally {
            setLoading(false);
        }
    };

    // Permission handling
    if (!permission) {
        return (
            <View style={styles.container}>
                <ActivityIndicator color={colors.primary} />
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.permissionContainer}>
                    <Text style={styles.permissionEmoji}>📸</Text>
                    <Text style={styles.permissionTitle}>Camera Access Needed</Text>
                    <Text style={styles.permissionText}>
                        We need your camera to verify you're at the gym!
                    </Text>
                    <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
                        <Text style={styles.permissionButtonText}>GRANT ACCESS</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // Photo Review Screen
    if (photo) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                    <View style={styles.reviewContainer}>
                        <Image source={{ uri: photo }} style={styles.previewImage} />

                        {/* Caption Input */}
                        <View style={styles.captionContainer}>
                            <TextInput
                                style={styles.captionInput}
                                placeholder="Add a caption..."
                                placeholderTextColor={colors.textMuted}
                                value={caption}
                                onChangeText={setCaption}
                                maxLength={100}
                                returnKeyType="done"
                            />

                            {/* Quick Captions */}
                            <View style={styles.quickCaptions}>
                                {CAPTION_OPTIONS.map((option) => (
                                    <TouchableOpacity
                                        key={option.label}
                                        style={[
                                            styles.quickCaption,
                                            caption === `${option.emoji} ${option.label}` && styles.quickCaptionActive,
                                        ]}
                                        onPress={() => setCaption(`${option.emoji} ${option.label}`)}
                                    >
                                        <Text style={styles.quickCaptionText}>
                                            {option.emoji} {option.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Actions */}
                        <View style={styles.reviewActions}>
                            <TouchableOpacity style={styles.retakeButton} onPress={retake}>
                                <Text style={styles.retakeButtonText}>RETAKE</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.postButton, loading && styles.buttonDisabled]}
                                onPress={submitCheckIn}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color={colors.background} />
                                ) : (
                                    <Text style={styles.postButtonText}>POST FIT CHECK</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </SafeAreaView>
        );
    }

    // Camera Screen
    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>FIT CHECK</Text>
                <TouchableOpacity onPress={pickImage}>
                    <Text style={styles.galleryButton}>🖼️</Text>
                </TouchableOpacity>
            </View>

            {/* Camera */}
            <View style={styles.cameraContainer}>
                <CameraView
                    ref={cameraRef}
                    style={styles.camera}
                    facing={facing}
                />
                {/* Overlay positioned absolutely to avoid CameraView children warning */}
                <View style={styles.cameraOverlay}>
                    <Text style={styles.beRealText}>Show up or shut up 💪</Text>
                </View>
            </View>

            {/* Controls */}
            <View style={styles.controls}>
                <TouchableOpacity style={styles.flipButton} onPress={toggleCamera}>
                    <Text style={styles.flipButtonText}>🔄</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
                    <View style={styles.captureButtonInner} />
                </TouchableOpacity>

                <View style={styles.placeholder} />
            </View>
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
    },
    closeButton: {
        fontSize: 24,
        color: colors.textPrimary,
    },
    headerTitle: {
        ...typography.labelLarge,
        color: colors.primary,
    },
    galleryButton: {
        fontSize: 24,
    },
    cameraContainer: {
        flex: 1,
        margin: spacing.md,
        borderRadius: borderRadius.xl,
        overflow: 'hidden',
    },
    camera: {
        flex: 1,
    },
    cameraOverlay: {
        position: 'absolute',
        bottom: spacing.xl,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    beRealText: {
        ...typography.labelMedium,
        color: colors.textPrimary,
        backgroundColor: colors.overlay,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
    },
    controls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
    },
    flipButton: {
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    flipButtonText: {
        fontSize: 28,
    },
    captureButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureButtonInner: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: colors.primary,
        borderWidth: 4,
        borderColor: colors.background,
    },
    placeholder: {
        width: 50,
    },
    // Permission styles
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    permissionEmoji: {
        fontSize: 64,
        marginBottom: spacing.lg,
    },
    permissionTitle: {
        ...typography.headlineLarge,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    permissionText: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.xl,
    },
    permissionButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
    },
    permissionButtonText: {
        ...typography.labelLarge,
        color: colors.background,
    },
    // Review styles
    reviewContainer: {
        flex: 1,
    },
    previewImage: {
        flex: 1,
        margin: spacing.md,
        borderRadius: borderRadius.xl,
    },
    captionContainer: {
        padding: spacing.md,
    },
    captionInput: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        color: colors.textPrimary,
        ...typography.bodyLarge,
        marginBottom: spacing.md,
    },
    quickCaptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    quickCaption: {
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: colors.border,
    },
    quickCaptionActive: {
        borderColor: colors.primary,
        backgroundColor: colors.primary + '20',
    },
    quickCaptionText: {
        ...typography.labelSmall,
        color: colors.textPrimary,
    },
    reviewActions: {
        flexDirection: 'row',
        padding: spacing.md,
        gap: spacing.md,
    },
    retakeButton: {
        flex: 1,
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    retakeButtonText: {
        ...typography.labelLarge,
        color: colors.textPrimary,
    },
    postButton: {
        flex: 2,
        backgroundColor: colors.primary,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    postButtonText: {
        ...typography.labelLarge,
        color: colors.background,
    },
});
