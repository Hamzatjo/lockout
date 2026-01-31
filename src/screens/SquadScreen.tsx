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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius } from '../theme';
import { supabase, Database } from '../lib/supabase';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Squad = Database['public']['Tables']['squads']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

type Props = {
    navigation: NativeStackNavigationProp<any>;
};

export default function SquadScreen({ navigation }: Props) {
    const [squad, setSquad] = useState<Squad | null>(null);
    const [members, setMembers] = useState<Profile[]>([]);
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
        } catch (error) {
            console.error('Error fetching squad:', error);
        } finally {
            setLoading(false);
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
            }
        };

        return (
            <TouchableOpacity
                style={styles.memberCard}
                onPress={handleMemberPress}
                activeOpacity={isCurrentUser ? 0.7 : 1}
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
                    <Text style={styles.memberName}>
                        {item.username || 'Unknown'} {isCurrentUser && '(You) →'}
                    </Text>
                    {isMemberLeader && (
                        <Text style={styles.leaderBadge}>👑 Squad Leader</Text>
                    )}
                </View>
                {isLeader && !isMemberLeader && (
                    <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => removeMember(item.id)}
                    >
                        <Text style={styles.removeButtonText}>✕</Text>
                    </TouchableOpacity>
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

                    {/* Invite Code */}
                    <TouchableOpacity style={styles.inviteCard} onPress={shareInviteCode}>
                        <View>
                            <Text style={styles.inviteLabel}>INVITE CODE</Text>
                            <Text style={styles.inviteCode}>{squad.invite_code}</Text>
                        </View>
                        <Text style={styles.shareButton}>📤 Share</Text>
                    </TouchableOpacity>

                    {/* Members List */}
                    <Text style={styles.sectionTitle}>MEMBERS</Text>
                    <FlatList
                        data={members}
                        renderItem={renderMember}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.membersList}
                    />

                    {/* Leave Squad */}
                    {!isLeader && (
                        <TouchableOpacity style={styles.leaveButton} onPress={leaveSquad}>
                            <Text style={styles.leaveButtonText}>Leave Squad</Text>
                        </TouchableOpacity>
                    )}
                </>
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
    // Invite Card
    inviteCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.surface,
        marginHorizontal: spacing.lg,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    inviteLabel: {
        ...typography.labelSmall,
        color: colors.textMuted,
        marginBottom: spacing.xs,
    },
    inviteCode: {
        ...typography.headlineLarge,
        color: colors.primary,
        letterSpacing: 4,
    },
    shareButton: {
        ...typography.labelMedium,
        color: colors.primary,
    },
    // Members
    sectionTitle: {
        ...typography.labelMedium,
        color: colors.textMuted,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.sm,
    },
    membersList: {
        paddingHorizontal: spacing.lg,
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
    memberName: {
        ...typography.bodyLarge,
        color: colors.textPrimary,
        fontWeight: '600',
    },
    leaderBadge: {
        ...typography.labelSmall,
        color: colors.warning,
        marginTop: spacing.xs,
    },
    removeButton: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    removeButtonText: {
        ...typography.bodyLarge,
        color: colors.error,
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
