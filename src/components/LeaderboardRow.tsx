// LOCKOUT Leaderboard Row Component

import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../theme';

type Props = {
    rank: number;
    username: string;
    avatarUrl: string | null;
    points: number;
    workoutCount: number;
    isCurrentUser?: boolean;
};

export default function LeaderboardRow({
    rank,
    username,
    avatarUrl,
    points,
    workoutCount,
    isCurrentUser = false,
}: Props) {
    const isTop3 = rank <= 3;
    const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;

    return (
        <View style={[
            styles.container,
            isCurrentUser && styles.currentUser,
            isTop3 && styles.top3,
        ]}>
            {/* Rank */}
            <View style={styles.rankContainer}>
                {rankEmoji ? (
                    <Text style={styles.rankEmoji}>{rankEmoji}</Text>
                ) : (
                    <Text style={styles.rankNumber}>{rank}</Text>
                )}
            </View>

            {/* Avatar */}
            <View style={[styles.avatar, isTop3 && styles.top3Avatar]}>
                {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                ) : (
                    <Text style={styles.avatarText}>
                        {username?.[0]?.toUpperCase() || '?'}
                    </Text>
                )}
            </View>

            {/* Info */}
            <View style={styles.info}>
                <Text style={[styles.name, isCurrentUser && styles.currentUserName]}>
                    {username} {isCurrentUser && '(You)'}
                </Text>
                <Text style={styles.workouts}>
                    {workoutCount} workout{workoutCount !== 1 ? 's' : ''}
                </Text>
            </View>

            {/* Points */}
            <View style={styles.pointsContainer}>
                <Text style={[styles.points, isTop3 && styles.top3Points]}>
                    {points}
                </Text>
                <Text style={styles.pointsLabel}>pts</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.sm,
    },
    currentUser: {
        borderWidth: 2,
        borderColor: colors.primary,
    },
    top3: {
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
    info: {
        flex: 1,
        marginLeft: spacing.md,
    },
    name: {
        ...typography.bodyLarge,
        color: colors.textPrimary,
        fontWeight: '600',
    },
    currentUserName: {
        color: colors.primary,
    },
    workouts: {
        ...typography.bodySmall,
        color: colors.textMuted,
    },
    pointsContainer: {
        alignItems: 'flex-end',
    },
    points: {
        ...typography.statsSmall,
        color: colors.textPrimary,
    },
    top3Points: {
        color: colors.primary,
    },
    pointsLabel: {
        ...typography.labelSmall,
        color: colors.textMuted,
    },
});
