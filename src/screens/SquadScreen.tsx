// LOCKOUT Squad Screen

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Image,
    Alert,
    Share,
    Clipboard,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius } from '../theme';
import { supabase, Database } from '../lib/supabase';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Squad = Database['public']['Tables']['squads']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface SquadStats {
    totalWorkouts: number;
    activeStreaks: number;
    topStreak: number;
}

type Props = {
    navigation: NativeStackNavigationProp<any>;
};

export default function SquadScreen({ navigation }: Props) {
    const [squad, setSquad] = useState<Squad | null>(null);
    const [members, setMembers] = useState<Profile[]>([]);
    const [squadStats, setSquadStats] = useState<SquadStats>({
        totalWorkouts: 0,
        activeStreaks: 0,
        topStreak: 0,
    });
    const [loading, setLoading] = useState(true);
    const [isLeader, setIsLeader] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Refetch data every time screen comes into focus
    useFocusEffect(
        useCallback(() => {
            fetchSquadData();
        }, [])
    );

    const fetchSquadData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setCurrentUserId(user.id);

            // Get user's squad membership
            const { data: membership } = await supabase
                .from('squad_members')
                .select('squad_id')
                .eq('user_id', user.id)
                .single();

            if (!membership) {
                setLoading(false);
                return;
            }

            // Get squad details
            const { data: squadData } = await supabase
                .from('squads')
                .select('*')
                .eq('id', membership.squad_id)
                .single();

            if (squadData) {
                setSquad(squadData);
                setIsLeader(squadData.leader_id === user.id);
            }

            // Get squad members with profiles
            const { data: membersData } = await supabase
                .from('squad_members')
                .select('user_id, profiles(*)')
                .eq('squad_id', membership.squad_id);

            if (membersData) {
                const profiles = membersData
                    .map((m: any) => m.profiles)
                    .filter(Boolean) as Profile[];
                setMembers(profiles);
            }

            // Fetch squad stats
            await fetchSquadStats(membership.squad_id);
        } catch (error) {
            console.error('Error fetching squad:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSquadStats = async (squadId: string) => {
        try {
            // Get total workouts for the squad
            const { count: totalWorkouts } = await supabase
                .from('workouts')
                .select('*', { count: 'exact', head: true })
                .eq('squad_id', squadId);

            // Get squad members' streak data
            const { data: memberProfiles } = await supabase
                .from('squad_members')
                .select('profiles(current_streak, longest_streak)')
                .eq('squad_id', squadId);

            let activeStreaks = 0;
            let topStreak = 0;

            if (memberProfiles) {
                memberProfiles.forEach((member: any) => {
                    if (member.profiles) {
                        const { current_streak, longest_streak } = member.profiles;

                        // Count active streaks (current_streak > 0)
                        if (current_streak > 0) {
                            activeStreaks++;
                        }

                        // Track highest longest_streak
                        if (longest_streak > topStreak) {
                            topStreak = longest_streak;
                        }
                    }
                });
            }

            setSquadStats({
                totalWorkouts: totalWorkouts || 0,
                activeStreaks,
                topStreak,
            });
        } catch (error) {
            console.error('Error fetching squad stats:', error);
        }
    };

    const shareInviteCode = async () => {
        if (!squad) return;

        try {
            await Share.share({
                message: `Join my LOCKOUT squad! 💪\n\nSquad: ${squad.name}\nCode: ${squad.invite_code}\n\nDownload LOCKOUT and enter the code to join the tribunal!`,
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    const copyInviteCode = async () => {
        if (!squad) return;

        try {
            Clipboard.setString(squad.invite_code);
            Alert.alert('Copied!', 'Invite code copied to clipboard');
        } catch (error) {
            console.error('Error copying:', error);
        }
    };

    const transferLeadership = async (newLeaderId: string) => {
        if (!squad || !isLeader) return;

        const newLeader = members.find(m => m.id === newLeaderId);

        Alert.alert(
            'Transfer Leadership?',
            `Make ${newLeader?.username || 'this member'} the new squad leader? You will lose leader privileges.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Transfer',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('squads')
                                .update({ leader_id: newLeaderId })
                                .eq('id', squad.id);

                            if (error) throw error;

                            setSquad(prev => prev ? { ...prev, leader_id: newLeaderId } : null);
                            setIsLeader(false);
                            Alert.alert('Success', 'Leadership transferred successfully!');
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to transfer leadership');
                        }
                    },
                },
            ]
        );
    };
    const leaveSquad = async () => {
        if (!squad || !currentUserId) return;

        if (isLeader) {
            Alert.alert(
                'Cannot Leave',
                'Squad leaders cannot leave. Transfer leadership first or delete the squad.'
            );
            return;
        }

        Alert.alert(
            'Leave Squad?',
            `Are you sure you want to leave ${squad.name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Leave',
                    style: 'destructive',
                    onPress: async () => {
                        await supabase
                            .from('squad_members')
                            .delete()
                            .eq('squad_id', squad.id)
                            .eq('user_id', currentUserId);

                        setSquad(null);
                        setMembers([]);
                    },
                },
            ]
        );
    };

    const removeMember = async (memberId: string) => {
        if (!squad || !isLeader) return;

        const member = members.find(m => m.id === memberId);

        Alert.alert(
            'Remove Member?',
            `Remove ${member?.username || 'this member'} from ${squad.name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        await supabase
                            .from('squad_members')
                            .delete()
                            .eq('squad_id', squad.id)
                            .eq('user_id', memberId);

                        setMembers(prev => prev.filter(m => m.id !== memberId));
                    },
                },
            ]
        );
    };

    const renderMember = ({ item }: { item: Profile }) => {
        const isMemberLeader = item.id === squad?.leader_id;
        const isCurrentUser = item.id === currentUserId;

        const handleMemberPress = () => {
            if (isCurrentUser) {
                navigation.navigate('Profile');
            } else if (isLeader && !isMemberLeader) {
                // Show leader actions for other members
                Alert.alert(
                    `Manage ${item.username}`,
                    'What would you like to do?',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Transfer Leadership',
                            onPress: () => transferLeadership(item.id),
                        },
                        {
                            text: 'Remove from Squad',
                            style: 'destructive',
                            onPress: () => removeMember(item.id),
                        },
                    ]
                );
            }
        };

        return (
            <TouchableOpacity
                style={styles.memberCard}
                onPress={handleMemberPress}
                activeOpacity={0.7}
            >
                <View style={styles.memberAvatar}>
                    {item.avatar_url ? (
                        <Image source={{ uri: item.avatar_url }} style={styles.avatarImage} />
                    ) : (
                        <Text style={styles.avatarText}>
                            {item.username?.[0]?.toUpperCase() || '?'}
                        </Text>
                    )}
                </View>
                <View style={styles.memberInfo}>
                    <View style={styles.memberNameRow}>
                        <Text style={styles.memberName}>
                            {item.username || 'Unknown'} {isCurrentUser && '(You)'}
                        </Text>
                        {item.current_streak > 0 && (
                            <Text style={styles.streakBadge}>
                                🔥 {item.current_streak}
                            </Text>
                        )}
                    </View>
                    {isMemberLeader && (
                        <Text style={styles.leaderBadge}>👑 Squad Leader</Text>
                    )}
                </View>
                {isCurrentUser && (
                    <Text style={styles.memberArrow}>→</Text>
                )}
                {isLeader && !isMemberLeader && !isCurrentUser && (
                    <Text style={styles.memberArrow}>⚙️</Text>
                )}
            </TouchableOpacity>
        );
    };

    // No squad - show options to create or join
    if (!squad && !loading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>YOUR SQUAD</Text>
                </View>

                <View style={styles.noSquadContainer}>
                    <Text style={styles.noSquadEmoji}>👥</Text>
                    <Text style={styles.noSquadTitle}>No Squad Yet</Text>
                    <Text style={styles.noSquadText}>
                        Create your own squad or join one with an invite code
                    </Text>

                    <TouchableOpacity
                        style={styles.createButton}
                        onPress={() => navigation.navigate('CreateSquad')}
                    >
                        <Text style={styles.createButtonText}>CREATE SQUAD</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.joinButton}
                        onPress={() => navigation.navigate('JoinSquad')}
                    >
                        <Text style={styles.joinButtonText}>JOIN WITH CODE</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>YOUR SQUAD</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {squad && (
                    <>
                        {/* Squad Info */}
                        <View style={styles.squadInfo}>
                            <Text style={styles.squadName}>{squad.name}</Text>
                            <View style={styles.squadMeta}>
                                <View style={styles.tierBadge}>
                                    <Text style={styles.tierText}>
                                        {squad.plan_tier.toUpperCase()}
                                    </Text>
                                </View>
                                <Text style={styles.memberCount}>
                                    {members.length}/{squad.member_limit} members
                                </Text>
                            </View>
                        </View>

                        {/* Squad Stats */}
                        <View style={styles.statsContainer}>
                            <Text style={styles.sectionTitle}>SQUAD STATS</Text>
                            <View style={styles.statsGrid}>
                                <View style={styles.statCard}>
                                    <Text style={styles.statNumber}>{squadStats.totalWorkouts}</Text>
                                    <Text style={styles.statLabel}>Total Workouts</Text>
                                </View>
                                <View style={styles.statCard}>
                                    <Text style={styles.statNumber}>{squadStats.activeStreaks}</Text>
                                    <Text style={styles.statLabel}>Active Streaks</Text>
                                </View>
                                <View style={styles.statCard}>
                                    <Text style={styles.statNumber}>{squadStats.topStreak}</Text>
                                    <Text style={styles.statLabel}>Top Streak</Text>
                                </View>
                            </View>
                        </View>

                        {/* Invite Code */}
                        <View style={styles.inviteSection}>
                            <Text style={styles.sectionTitle}>INVITE CODE</Text>
                            <View style={styles.inviteCard}>
                                <View style={styles.inviteCodeContainer}>
                                    <Text style={styles.inviteCode}>{squad.invite_code}</Text>
                                </View>
                                <View style={styles.inviteActions}>
                                    <TouchableOpacity style={styles.inviteButton} onPress={copyInviteCode}>
                                        <Text style={styles.inviteButtonText}>📋 Copy</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.inviteButton} onPress={shareInviteCode}>
                                        <Text style={styles.inviteButtonText}>📤 Share</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        {/* Members List */}
                        <View style={styles.membersSection}>
                            <Text style={styles.sectionTitle}>MEMBERS</Text>
                            {members.map((member) => (
                                <View key={member.id}>
                                    {renderMember({ item: member })}
                                </View>
                            ))}
                        </View>

                        {/* Leave Squad */}
                        {!isLeader && (
                            <TouchableOpacity style={styles.leaveButton} onPress={leaveSquad}>
                                <Text style={styles.leaveButtonText}>Leave Squad</Text>
                            </TouchableOpacity>
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
    header: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerTitle: {
        ...typography.labelLarge,
        color: colors.primary,
    },
    // No Squad styles
    noSquadContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    noSquadEmoji: {
        fontSize: 64,
        marginBottom: spacing.lg,
    },
    noSquadTitle: {
        ...typography.headlineLarge,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    noSquadText: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.xl,
    },
    createButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.md,
        width: '100%',
        alignItems: 'center',
    },
    createButtonText: {
        ...typography.labelLarge,
        color: colors.background,
    },
    joinButton: {
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.primary,
        width: '100%',
        alignItems: 'center',
    },
    joinButtonText: {
        ...typography.labelLarge,
        color: colors.primary,
    },
    // Squad Info styles
    squadInfo: {
        padding: spacing.lg,
        alignItems: 'center',
    },
    squadName: {
        ...typography.displaySmall,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    squadMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    tierBadge: {
        backgroundColor: colors.accent + '20',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.sm,
    },
    tierText: {
        ...typography.labelSmall,
        color: colors.accent,
    },
    memberCount: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
    },
    // Squad Stats
    statsContainer: {
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.lg,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: spacing.sm,
    },
    statCard: {
        flex: 1,
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    statNumber: {
        ...typography.statsSmall,
        color: colors.primary,
        marginBottom: spacing.xs,
    },
    statLabel: {
        ...typography.labelSmall,
        color: colors.textMuted,
        textAlign: 'center',
    },
    // Invite Section
    inviteSection: {
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.lg,
    },
    inviteCard: {
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    inviteCodeContainer: {
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    inviteCode: {
        ...typography.headlineLarge,
        color: colors.primary,
        letterSpacing: 4,
    },
    inviteActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    inviteButton: {
        backgroundColor: colors.primary + '20',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.sm,
    },
    inviteButtonText: {
        ...typography.labelMedium,
        color: colors.primary,
    },
    // Members
    membersSection: {
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        ...typography.labelMedium,
        color: colors.textMuted,
        marginBottom: spacing.sm,
    },
    memberCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.sm,
    },
    memberAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
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
    memberInfo: {
        flex: 1,
        marginLeft: spacing.md,
    },
    memberNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    memberName: {
        ...typography.bodyLarge,
        color: colors.textPrimary,
        fontWeight: '600',
        flex: 1,
    },
    streakBadge: {
        ...typography.labelSmall,
        color: colors.warning,
        backgroundColor: colors.warning + '20',
        paddingHorizontal: spacing.xs,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
        marginLeft: spacing.sm,
    },
    leaderBadge: {
        ...typography.labelSmall,
        color: colors.warning,
        marginTop: spacing.xs,
    },
    memberArrow: {
        ...typography.bodyLarge,
        color: colors.textMuted,
    },
    leaveButton: {
        margin: spacing.lg,
        padding: spacing.md,
        alignItems: 'center',
    },
    leaveButtonText: {
        ...typography.labelMedium,
        color: colors.error,
    },
});
