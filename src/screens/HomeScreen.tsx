// LOCKOUT Home Screen

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Image,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { supabase, Database } from '../lib/supabase';
import MediaViewer from '../components/MediaViewer';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Workout = Database['public']['Tables']['workouts']['Row'] & {
    profiles: { username: string; avatar_url: string | null } | null;
};

type Props = {
    navigation: NativeStackNavigationProp<any>;
};

export default function HomeScreen({ navigation }: Props) {
    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [squadName, setSquadName] = useState<string | null>(null);
    const [selectedMedia, setSelectedMedia] = useState<{
        url: string;
        isVideo: boolean;
        caption?: string;
        username?: string;
    } | null>(null);

    const fetchFeed = async () => {
        // Get user's squad
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: membership } = await supabase
            .from('squad_members')
            .select('squad_id, squads(name)')
            .eq('user_id', user.id)
            .single();

        if (membership?.squads) {
            setSquadName((membership.squads as any).name);
        }

        // Get recent workouts from squad
        if (membership?.squad_id) {
            const { data } = await supabase
                .from('workouts')
                .select('*, profiles(username, avatar_url)')
                .eq('squad_id', membership.squad_id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (data) {
                setWorkouts(data as Workout[]);
            }
        }
    };

    useEffect(() => {
        fetchFeed();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchFeed();
        setRefreshing(false);
    };

    // Check if media is a video based on URL or verification level
    const isVideoMedia = (item: Workout): boolean => {
        if (item.verification_level === 'tribunal') return true;
        if (item.media_url?.includes('.mp4')) return true;
        return false;
    };

    const openMedia = (item: Workout) => {
        if (item.media_url) {
            setSelectedMedia({
                url: item.media_url,
                isVideo: isVideoMedia(item),
                caption: item.caption || undefined,
                username: item.profiles?.username || undefined,
            });
        }
    };

    const renderWorkoutCard = ({ item }: { item: Workout }) => {
        const isCheckIn = item.verification_level === 'check_in';
        const isTribunal = item.verification_level === 'tribunal';
        const isVideo = isVideoMedia(item);

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => openMedia(item)}
                activeOpacity={0.9}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.avatar}>
                        {item.profiles?.avatar_url ? (
                            <Image source={{ uri: item.profiles.avatar_url }} style={styles.avatarImage} />
                        ) : (
                            <Text style={styles.avatarText}>
                                {item.profiles?.username?.[0]?.toUpperCase() || '?'}
                            </Text>
                        )}
                    </View>
                    <View style={styles.cardHeaderText}>
                        <Text style={styles.username}>{item.profiles?.username || 'Unknown'}</Text>
                        <Text style={styles.timestamp}>
                            {new Date(item.created_at).toLocaleDateString()}
                        </Text>
                    </View>
                    <View style={[
                        styles.badge,
                        isCheckIn ? styles.badgeCheckIn : styles.badgeTribunal
                    ]}>
                        <Text style={styles.badgeText}>
                            {isCheckIn ? '📍' : '⚖️'} {isCheckIn ? 'CHECK IN' : 'TRIBUNAL'}
                        </Text>
                    </View>
                </View>

                {item.thumbnail_url && (
                    <View style={styles.mediaContainer}>
                        {isVideo ? (
                            <>
                                <Image
                                    source={{ uri: item.thumbnail_url }}
                                    style={styles.cardImage}
                                    blurRadius={2}
                                />
                                <View style={styles.playOverlay}>
                                    <Text style={styles.playIcon}>▶️</Text>
                                    <Text style={styles.tapToPlay}>Tap to play</Text>
                                </View>
                            </>
                        ) : (
                            <Image source={{ uri: item.thumbnail_url }} style={styles.cardImage} />
                        )}
                    </View>
                )}

                {item.caption && (
                    <Text style={styles.caption}>{item.caption}</Text>
                )}

                {isTribunal && (
                    <View style={styles.pointsBadge}>
                        <Text style={styles.pointsText}>
                            {item.points > 0 ? `+${item.points} pts` : 'PENDING'}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.logo}>LOCKOUT</Text>
                {squadName && <Text style={styles.squadName} numberOfLines={1} ellipsizeMode="tail">{squadName}</Text>}
            </View>

            {/* Action Buttons */}
            <View style={styles.actions}>
                <TouchableOpacity
                    style={styles.checkInButton}
                    onPress={() => navigation.navigate('FitCheck')}
                >
                    <Text style={styles.checkInEmoji}>📸</Text>
                    <Text style={styles.checkInText} numberOfLines={1}>CHECK IN</Text>
                    <Text style={styles.checkInSubtext} numberOfLines={1} ellipsizeMode="tail">Fit Check</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.claimPRButton}
                    onPress={() => navigation.navigate('TribunalUpload')}
                >
                    <Text style={styles.claimPREmoji}>⚖️</Text>
                    <Text style={styles.claimPRText} numberOfLines={1}>CLAIM PR</Text>
                    <Text style={styles.claimPRSubtext} numberOfLines={1} ellipsizeMode="tail">Face the Tribunal</Text>
                </TouchableOpacity>
            </View>

            {/* Feed */}
            <FlatList
                data={workouts}
                renderItem={renderWorkoutCard}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.feed}
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
                        <Text style={styles.emptyTitle}>No activity yet</Text>
                        <Text style={styles.emptyText}>
                            Be the first to check in or claim a PR!
                        </Text>
                    </View>
                }
            />

            {/* Media Viewer Modal */}
            {selectedMedia && (
                <MediaViewer
                    visible={!!selectedMedia}
                    mediaUrl={selectedMedia.url}
                    isVideo={selectedMedia.isVideo}
                    caption={selectedMedia.caption}
                    username={selectedMedia.username}
                    onClose={() => setSelectedMedia(null)}
                />
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
    logo: {
        ...typography.headlineLarge,
        color: colors.primary,
    },
    squadName: {
        ...typography.labelSmall,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    logoutButton: {
        padding: spacing.sm,
    },
    logoutText: {
        fontSize: 24,
    },
    actions: {
        flexDirection: 'row',
        padding: spacing.md,
        gap: spacing.md,
    },
    checkInButton: {
        flex: 1,
        backgroundColor: colors.primary,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        alignItems: 'center',
        ...shadows.glow,
    },
    checkInEmoji: {
        fontSize: 32,
        marginBottom: spacing.xs,
    },
    checkInText: {
        ...typography.labelLarge,
        color: colors.background,
    },
    checkInSubtext: {
        ...typography.labelSmall,
        color: colors.background,
        opacity: 0.7,
        marginTop: spacing.xs,
    },
    claimPRButton: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.accent,
    },
    claimPREmoji: {
        fontSize: 32,
        marginBottom: spacing.xs,
    },
    claimPRText: {
        ...typography.labelLarge,
        color: colors.accent,
    },
    claimPRSubtext: {
        ...typography.labelSmall,
        color: colors.textMuted,
        marginTop: spacing.xs,
    },
    feed: {
        padding: spacing.md,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.md,
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    avatarText: {
        ...typography.headlineSmall,
        color: colors.primary,
    },
    cardHeaderText: {
        flex: 1,
        marginLeft: spacing.md,
    },
    username: {
        ...typography.bodyLarge,
        color: colors.textPrimary,
        fontWeight: '600',
    },
    timestamp: {
        ...typography.bodySmall,
        color: colors.textMuted,
    },
    badge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.sm,
    },
    badgeCheckIn: {
        backgroundColor: colors.primary + '20',
    },
    badgeTribunal: {
        backgroundColor: colors.accent + '20',
    },
    badgeText: {
        ...typography.labelSmall,
        color: colors.textPrimary,
    },
    mediaContainer: {
        position: 'relative',
    },
    playOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    playIcon: {
        fontSize: 48,
    },
    tapToPlay: {
        ...typography.labelSmall,
        color: colors.textPrimary,
        marginTop: spacing.xs,
    },
    cardImage: {
        width: '100%',
        height: 400,
        resizeMode: 'cover',
    },
    caption: {
        ...typography.bodyMedium,
        color: colors.textPrimary,
        padding: spacing.md,
    },
    pointsBadge: {
        position: 'absolute',
        bottom: spacing.md,
        right: spacing.md,
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.sm,
    },
    pointsText: {
        ...typography.labelSmall,
        color: colors.background,
        fontWeight: '700',
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
        marginBottom: spacing.xs,
    },
    emptyText: {
        ...typography.bodyMedium,
        color: colors.textMuted,
        textAlign: 'center',
    },
});
