// LOCKOUT Create Squad Screen

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

type Props = {
    navigation: NativeStackNavigationProp<any>;
};

export default function CreateSquadScreen({ navigation }: Props) {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    const createSquad = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Please enter a squad name');
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
                throw new Error('You are already in a squad. Leave it first to create a new one.');
            }

            // Create squad (trigger will add user as member)
            const { data: squad, error } = await supabase
                .from('squads')
                .insert({
                    name: name.trim(),
                    leader_id: user.id,
                })
                .select()
                .single();

            if (error) throw error;

            Alert.alert(
                '🎉 Squad Created!',
                `Welcome to ${squad.name}!\n\nInvite code: ${squad.invite_code}`,
                [{ text: 'Let\'s Go!', onPress: () => navigation.goBack() }]
            );
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to create squad');
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
                <Text style={styles.headerTitle}>CREATE SQUAD</Text>
                <View style={styles.placeholder} />
            </View>

            <View style={styles.content}>
                <Text style={styles.emoji}>💪</Text>
                <Text style={styles.title}>Start Your Squad</Text>
                <Text style={styles.subtitle}>
                    Create a squad and invite your gym crew to join the tribunal
                </Text>

                <TextInput
                    style={styles.input}
                    placeholder="Squad Name"
                    placeholderTextColor={colors.textMuted}
                    value={name}
                    onChangeText={setName}
                    maxLength={30}
                    autoFocus
                />

                <View style={styles.tierInfo}>
                    <Text style={styles.tierTitle}>FREE TIER (LITE)</Text>
                    <Text style={styles.tierText}>• Up to 5 members</Text>
                    <Text style={styles.tierText}>• Unlimited Fit Checks</Text>
                    <Text style={styles.tierText}>• Tribunal voting</Text>
                    <Text style={styles.tierText}>• Weekly leaderboard</Text>
                </View>

                <TouchableOpacity
                    style={[styles.createButton, loading && styles.buttonDisabled]}
                    onPress={createSquad}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color={colors.background} />
                    ) : (
                        <Text style={styles.createButtonText}>CREATE SQUAD</Text>
                    )}
                </TouchableOpacity>
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
        color: colors.textPrimary,
        ...typography.headlineMedium,
        textAlign: 'center',
        width: '100%',
        marginBottom: spacing.lg,
        borderWidth: 2,
        borderColor: colors.primary,
    },
    tierInfo: {
        backgroundColor: colors.surface,
        padding: spacing.lg,
        borderRadius: borderRadius.md,
        width: '100%',
        marginBottom: spacing.xl,
    },
    tierTitle: {
        ...typography.labelMedium,
        color: colors.primary,
        marginBottom: spacing.md,
        textAlign: 'center',
    },
    tierText: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },
    createButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        borderRadius: borderRadius.md,
        width: '100%',
        alignItems: 'center',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    createButtonText: {
        ...typography.labelLarge,
        color: colors.background,
    },
});
