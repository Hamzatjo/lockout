// LOCKOUT Join Squad Screen

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '../theme';
import { supabase } from '../lib/supabase';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { MainStackParamList } from '../navigation/MainNavigator';

type Props = {
    navigation: NativeStackNavigationProp<MainStackParamList, 'JoinSquad'>;
    route: RouteProp<MainStackParamList, 'JoinSquad'>;
};

export default function JoinSquadScreen({ navigation, route }: Props) {
    const [code, setCode] = useState(route.params?.inviteCode?.toUpperCase() || '');
    const [loading, setLoading] = useState(false);

    const joinSquad = async () => {
        const cleanCode = code.trim().toUpperCase();

        if (!cleanCode || cleanCode.length < 4) {
            Alert.alert('Error', 'Please enter a valid invite code');
            return;
        }

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Check if user already in a squad
            const { data: existingMembership } = await supabase
                .from('squad_members')
                .select('squad_id')
                .eq('user_id', user.id)
                .single();

            if (existingMembership) {
                throw new Error('You are already in a squad. Leave it first to join another.');
            }

            // Find squad by invite code
            const { data: squad, error: squadError } = await supabase
                .from('squads')
                .select('*')
                .eq('invite_code', cleanCode)
                .single();

            if (squadError || !squad) {
                throw new Error('Invalid invite code. Check with your squad leader.');
            }

            // Check if squad has room (RLS will enforce this too, but better UX)
            const { count } = await supabase
                .from('squad_members')
                .select('*', { count: 'exact', head: true })
                .eq('squad_id', squad.id);

            if ((count || 0) >= squad.member_limit) {
                throw new Error(`${squad.name} is full (${squad.member_limit} members max). Ask the leader to upgrade.`);
            }

            // Join squad
            const { error: joinError } = await supabase
                .from('squad_members')
                .insert({
                    squad_id: squad.id,
                    user_id: user.id,
                });

            if (joinError) throw joinError;

            Alert.alert(
                '🎉 Welcome to the Squad!',
                `You've joined ${squad.name}!\n\nTime to face the tribunal.`,
                [{ text: 'Let\'s Go!', onPress: () => navigation.goBack() }]
            );
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to join squad');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backButton}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>JOIN SQUAD</Text>
                <View style={styles.placeholder} />
            </View>

            <View style={styles.content}>
                <Text style={styles.emoji}>🔑</Text>
                <Text style={styles.title}>Enter Invite Code</Text>
                <Text style={styles.subtitle}>
                    Got an invite code from a friend? Enter it below to join their squad.
                </Text>

                <TextInput
                    style={styles.input}
                    placeholder="XXXXXX"
                    placeholderTextColor={colors.textMuted}
                    value={code}
                    onChangeText={(text) => setCode(text.toUpperCase())}
                    maxLength={8}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    autoFocus
                />

                <TouchableOpacity
                    style={[styles.joinButton, loading && styles.buttonDisabled]}
                    onPress={joinSquad}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color={colors.background} />
                    ) : (
                        <Text style={styles.joinButtonText}>JOIN SQUAD</Text>
                    )}
                </TouchableOpacity>

                <Text style={styles.hint}>
                    Don't have a code? Ask a friend for theirs or create your own squad.
                </Text>
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
    content: {
        flex: 1,
        padding: spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emoji: {
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
    input: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        padding: spacing.lg,
        color: colors.primary,
        ...typography.displayMedium,
        textAlign: 'center',
        width: '100%',
        marginBottom: spacing.lg,
        borderWidth: 2,
        borderColor: colors.primary,
        letterSpacing: 8,
    },
    joinButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        borderRadius: borderRadius.md,
        width: '100%',
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    joinButtonText: {
        ...typography.labelLarge,
        color: colors.background,
    },
    hint: {
        ...typography.bodySmall,
        color: colors.textMuted,
        textAlign: 'center',
    },
});
