import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '../theme';
import { supabase } from '../lib/supabase';
import { getExerciseName, MUSCLE_GROUP_ICONS, Exercise } from '../data/exercises';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type PRRecord = {
    id: string;
    user_id: string;
    username: string;
    avatar_url: string | null;
    weight_kg: number;
    reps: number;
    estimated_1rm: number;
    is_verified: boolean;
    created_at: string;
};

type Props = {
    navigation: NativeStackNavigationProp<any>;
    route: {
        params: {
            exercise: Exercise;
        };
    };
};

export function calculate1RM(weightKg: number, reps: number): number {
    if (reps <= 0 || reps > 12) return 0;
    return Math.round(weightKg * (36 / (37 - reps)));
}

export default function PRLeaderboardScreen({ navigation, route }: Props) {
    const { exercise } = route.params;
    const [records, setRecords] = useState<PRRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [squadName, setSquadName] = useState<string | null>(null);
    const [verifiedOnly, setVerifiedOnly] = useState(false);

    useEffect(() => {
        fetchPRs();
    }, [exercise.id, verifiedOnly]);

    const fetchPRs = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setCurrentUserId(user.id);

            const { data: membership } = await supabase
                .from('squad_members')
                .select('squad_id, squads(name)')
                .eq('user_id', user.id)
                .single();

            if (!membership) {
                setLoading(false);
                return;
            }

            setSquadName((membership.squads as any)?.name || null);

            let query = supabase
                .from('workouts')
                .select('id, user_id, weight_kg, reps, is_verified, created_at, profiles(username, avatar_url)')
                .eq('squad_id', membership.squad_id)
                .eq('exercise_type', exercise.id)
                .not('weight_kg', 'is', null)
                .not('reps', 'is', null)
                .gt('weight_kg', 0)
                .gt('reps', 0);

            if (verifiedOnly) {
                query = query.eq('is_verified', true);
            }

            const { data } = await query;

            if (data) {
                const processed: PRRecord[] = data.map((w: any) => ({
                    id: w.id,
                    user_id: w.user_id,
                    username: w.profiles?.username || 'Unknown',
                    avatar_url: w.profiles?.avatar_url || null,
                    weight_kg: parseFloat(w.weight_kg) || 0,
                    reps: w.reps || 0,
                    estimated_1rm: calculate1RM(parseFloat(w.weight_kg) || 0, w.reps || 0),
                    is_verified: w.is_verified || false,
                    created_at: w.created_at,
                }));

                const userBestPRs: Record<string, PRRecord> = {};
                processed.forEach(pr => {
                    if (pr.estimated_1rm > 0) {
                        const existing = userBestPRs[pr.user_id];
                        if (!existing || pr.estimated_1rm > existing.estimated_1rm) {
                            userBestPRs[pr.user_id] = pr;
                        }
                    }
                });

                const sorted = Object.values(userBestPRs).sort(
                    (a, b) => b.estimated_1rm - a.estimated_1rm
                );
                setRecords(sorted);
            }
        } catch (error) {
            console.error('Error fetching PRs:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchPRs();
    };

    const renderRecord = ({ item, index }: { item: PRRecord; index: number }) => {
        const rank = index + 1;
        const isCurrentUser = item.user_id === currentUserId;
        const isTop3 = rank <= 3;

        const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;

        return (
            <View style={[
                styles.recordCard,
                isCurrentUser && styles.currentUserCard,
                isTop3 && styles.top3Card,
            ]}>
                <View style={styles.rankContainer}>
                    {rankEmoji ? (
                        <Text style={styles.rankEmoji}>{rankEmoji}</Text>
                    ) : (
                        <Text style={styles.rankNumber}>{rank}</Text>
                    )}
                </View>

                <View style={[styles.avatar, isTop3 && styles.top3Avatar]}>
                    {item.avatar_url ? (
                        <Image source={{ uri: item.avatar_url }} style={styles.avatarImage} />
                    ) : (
                        <Text style={styles.avatarText}>
                            {item.username?.[0]?.toUpperCase() || '?'}
                        </Text>
                    )}
                </View>

                <View style={styles.recordInfo}>
                    <Text style={[styles.recordName, isCurrentUser && styles.currentUserName]}>
                        {item.username} {isCurrentUser && '(You)'}
                    </Text>
                    <View style={styles.liftDetails}>
                        <Text style={styles.liftWeight}>
                            {item.weight_kg} kg × {item.reps}
                        </Text>
                    </View>
                </View>

                <View style={styles.prContainer}>
                    <Text style={[styles.prValue, isTop3 && styles.top3PrValue]}>
                        {item.estimated_1rm}
                    </Text>
                    <Text style={styles.prLabel}>kg 1RM</Text>
                    {item.is_verified && (
                        <View style={styles.verifiedBadge}>
                            <Text style={styles.verifiedText}>✓</Text>
                        </View>
                    )}
                </View>
            </View>
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
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backButton}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>PR LEADERBOARD</Text>
                <View style={styles.placeholder} />
            </View>

            <View style={styles.exerciseHeader}>
                <Text style={styles.exerciseIcon}>
                    {MUSCLE_GROUP_ICONS[exercise.muscleGroup]}
                </Text>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                {squadName && <Text style={styles.squadName}>{squadName}</Text>}
            </View>

            <View style={styles.filterRow}>
                <TouchableOpacity
                    style={[styles.filterButton, verifiedOnly && styles.filterActive]}
                    onPress={() => setVerifiedOnly(!verifiedOnly)}
                >
                    <Text style={[styles.filterText, verifiedOnly && styles.filterTextActive]}>
                        {verifiedOnly ? '✓ Verified Only' : 'All PRs'}
                    </Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={records}
                renderItem={renderRecord}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
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
                        <Text style={styles.emptyTitle}>No PRs yet</Text>
                        <Text style={styles.emptyText}>
                            Claim a PR in the Tribunal to get on the board!
                        </Text>
                    </View>
                }
            />
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
    backButton: {
        ...typography.bodyLarge,
        color: colors.primary,
    },
    headerTitle: {
        ...typography.labelLarge,
        color: colors.primary,
    },
    placeholder: {
        width: 50,
    },
    exerciseHeader: {
        alignItems: 'center',
        paddingVertical: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    exerciseIcon: {
        fontSize: 40,
        marginBottom: spacing.sm,
    },
    exerciseName: {
        ...typography.headlineMedium,
        color: colors.textPrimary,
    },
    squadName: {
        ...typography.labelSmall,
        color: colors.textMuted,
        marginTop: spacing.xs,
    },
    filterRow: {
        flexDirection: 'row',
        padding: spacing.md,
        justifyContent: 'center',
    },
    filterButton: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: borderRadius.full,
        backgroundColor: colors.surface,
        alignItems: 'center',
    },
    filterActive: {
        backgroundColor: colors.primary,
    },
    filterText: {
        ...typography.labelSmall,
        color: colors.textSecondary,
    },
    filterTextActive: {
        color: colors.background,
        fontWeight: '700',
    },
    list: {
        padding: spacing.md,
    },
    recordCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.sm,
    },
    currentUserCard: {
        borderWidth: 2,
        borderColor: colors.primary,
    },
    top3Card: {
        backgroundColor: colors.surfaceLight,
    },
    rankContainer: {
        width: 36,
        alignItems: 'center',
    },
    rankEmoji: {
        fontSize: 24,
    },
    rankNumber: {
        ...typography.headlineMedium,
        color: colors.textMuted,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.surfaceLighter,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: spacing.sm,
    },
    top3Avatar: {
        borderWidth: 2,
        borderColor: colors.primary,
    },
    avatarImage: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    avatarText: {
        ...typography.headlineSmall,
        color: colors.primary,
    },
    recordInfo: {
        flex: 1,
        marginLeft: spacing.md,
    },
    recordName: {
        ...typography.bodyLarge,
        color: colors.textPrimary,
        fontWeight: '600',
    },
    currentUserName: {
        color: colors.primary,
    },
    liftDetails: {
        flexDirection: 'row',
        marginTop: spacing.xs,
    },
    liftWeight: {
        ...typography.bodySmall,
        color: colors.textMuted,
    },
    prContainer: {
        alignItems: 'flex-end',
    },
    prValue: {
        ...typography.statsSmall,
        color: colors.textPrimary,
    },
    top3PrValue: {
        color: colors.primary,
    },
    prLabel: {
        ...typography.labelSmall,
        color: colors.textMuted,
    },
    verifiedBadge: {
        backgroundColor: colors.valid,
        width: 16,
        height: 16,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: spacing.xs,
    },
    verifiedText: {
        color: colors.background,
        fontSize: 10,
        fontWeight: '700',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing.xxl,
    },
    emptyEmoji: {
        fontSize: 64,
        marginBottom: spacing.lg,
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
});
