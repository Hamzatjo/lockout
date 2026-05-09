// LOCKOUT Profile Screen - User settings for App Store compliance

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ScrollView,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '../theme';
import { supabase } from '../lib/supabase';
import { StreakBadge } from '../components/StreakBadge';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Props = {
    navigation: NativeStackNavigationProp<any>;
};

export default function ProfileScreen({ navigation }: Props) {
    const [username, setUsername] = useState<string | null>(null);
    const [email, setEmail] = useState<string | null>(null);
    const [currentStreak, setCurrentStreak] = useState<number>(0);
    const [totalWorkouts, setTotalWorkouts] = useState<number>(0);
    const [memberSince, setMemberSince] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setEmail(user.email || null);

            const { data: profile } = await supabase
                .from('profiles')
                .select('username, current_streak, created_at')
                .eq('id', user.id)
                .single();

            if (profile) {
                setUsername(profile.username);
                setCurrentStreak(profile.current_streak || 0);
                setMemberSince(profile.created_at);
            }

            // Get total workouts count
            const { count } = await supabase
                .from('workouts')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id);

            setTotalWorkouts(count || 0);
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            'Log Out',
            'Are you sure you want to log out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Log Out',
                    style: 'destructive',
                    onPress: async () => {
                        await supabase.auth.signOut();
                    },
                },
            ]
        );
    };

    const handleDeleteAccount = async () => {
        Alert.alert(
            '⚠️ Delete Account',
            'This will permanently delete your account and all data. This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete Forever',
                    style: 'destructive',
                    onPress: () => confirmDeleteAccount(),
                },
            ]
        );
    };

    const confirmDeleteAccount = async () => {
        Alert.alert(
            'Final Confirmation',
            'Type DELETE to confirm account deletion',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'I understand, delete my account',
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            const { data: { user } } = await supabase.auth.getUser();
                            if (!user) throw new Error('Not authenticated');

                            // Delete profile (cascade will remove squad memberships, workouts, votes)
                            await supabase.from('profiles').delete().eq('id', user.id);

                            // Sign out
                            await supabase.auth.signOut();

                            Alert.alert('Account Deleted', 'Your account has been permanently deleted.');
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to delete account');
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const openPrivacyPolicy = () => {
        // Replace with your actual privacy policy URL
        Linking.openURL('https://lockout.app/privacy');
    };

    const openTermsOfService = () => {
        // Replace with your actual terms URL
        Linking.openURL('https://lockout.app/terms');
    };

    const openSupport = () => {
        Linking.openURL('mailto:support@lockout.app');
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backButton}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>PROFILE</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.content}>
                {/* User Info */}
                <View style={styles.section}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {username?.[0]?.toUpperCase() || '?'}
                        </Text>
                    </View>
                    <Text style={styles.username}>@{username || 'User'}</Text>
                    <Text style={styles.email}>{email}</Text>

                    {/* Streak Display */}
                    <View style={styles.streakContainer}>
                        <StreakBadge streak={currentStreak} mode="full" />
                    </View>

                    {/* Stats Row */}
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{totalWorkouts}</Text>
                            <Text style={styles.statLabel}>Workouts</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>
                                {memberSince ? new Date(memberSince).toLocaleDateString('en-US', {
                                    month: 'short',
                                    year: 'numeric'
                                }) : 'N/A'}
                            </Text>
                            <Text style={styles.statLabel}>Member Since</Text>
                        </View>
                    </View>
                </View>

                {/* Quick Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => navigation.navigate('WorkoutHistory')}
                    >
                        <Text style={styles.menuIcon}>📅</Text>
                        <Text style={styles.menuText}>Workout History</Text>
                        <Text style={styles.menuArrow}>→</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => navigation.navigate('StatsOverview')}
                    >
                        <Text style={styles.menuIcon}>📊</Text>
                        <Text style={styles.menuText}>View Stats</Text>
                        <Text style={styles.menuArrow}>→</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => navigation.navigate('Settings')}
                    >
                        <Text style={styles.menuIcon}>⚙️</Text>
                        <Text style={styles.menuText}>Settings</Text>
                        <Text style={styles.menuArrow}>→</Text>
                    </TouchableOpacity>
                </View>

                {/* Settings */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>SETTINGS</Text>

                    <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Coming Soon', 'Notification settings will be available in a future update.')}>
                        <Text style={styles.menuIcon}>🔔</Text>
                        <Text style={styles.menuText}>Notifications</Text>
                        <Text style={styles.menuArrow}>→</Text>
                    </TouchableOpacity>
                </View>

                {/* Legal */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>LEGAL</Text>

                    <TouchableOpacity style={styles.menuItem} onPress={openPrivacyPolicy}>
                        <Text style={styles.menuIcon}>🔒</Text>
                        <Text style={styles.menuText}>Privacy Policy</Text>
                        <Text style={styles.menuArrow}>→</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={openTermsOfService}>
                        <Text style={styles.menuIcon}>📄</Text>
                        <Text style={styles.menuText}>Terms of Service</Text>
                        <Text style={styles.menuArrow}>→</Text>
                    </TouchableOpacity>
                </View>

                {/* Support */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>SUPPORT</Text>

                    <TouchableOpacity style={styles.menuItem} onPress={openSupport}>
                        <Text style={styles.menuIcon}>💬</Text>
                        <Text style={styles.menuText}>Contact Support</Text>
                        <Text style={styles.menuArrow}>→</Text>
                    </TouchableOpacity>
                </View>

                {/* Account Actions */}
                <View style={styles.section}>
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Text style={styles.logoutText}>Log Out</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={handleDeleteAccount}
                        disabled={loading}
                    >
                        <Text style={styles.deleteText}>
                            {loading ? 'Deleting...' : 'Delete Account'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* App Version */}
                <Text style={styles.version}>LOCKOUT v1.0.0</Text>
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
    },
    section: {
        padding: spacing.lg,
        alignItems: 'center',
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    avatarText: {
        ...typography.displaySmall,
        color: colors.background,
    },
    username: {
        ...typography.headlineMedium,
        color: colors.textPrimary,
    },
    email: {
        ...typography.bodyMedium,
        color: colors.textMuted,
        marginTop: spacing.xs,
    },
    streakContainer: {
        marginTop: spacing.lg,
        marginBottom: spacing.md,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.lg,
        paddingHorizontal: spacing.lg,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statNumber: {
        ...typography.headlineMedium,
        color: colors.primary,
        fontWeight: '700',
    },
    statLabel: {
        ...typography.labelSmall,
        color: colors.textMuted,
        marginTop: spacing.xs,
    },
    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: colors.border,
        marginHorizontal: spacing.lg,
    },
    sectionTitle: {
        ...typography.labelSmall,
        color: colors.textMuted,
        alignSelf: 'flex-start',
        marginBottom: spacing.md,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.sm,
        width: '100%',
    },
    menuIcon: {
        fontSize: 20,
        marginRight: spacing.md,
    },
    menuText: {
        ...typography.bodyLarge,
        color: colors.textPrimary,
        flex: 1,
    },
    menuArrow: {
        ...typography.bodyLarge,
        color: colors.textMuted,
    },
    logoutButton: {
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        width: '100%',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    logoutText: {
        ...typography.labelLarge,
        color: colors.textPrimary,
    },
    deleteButton: {
        backgroundColor: 'transparent',
        padding: spacing.md,
        borderRadius: borderRadius.md,
        width: '100%',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.error,
    },
    deleteText: {
        ...typography.labelMedium,
        color: colors.error,
    },
    version: {
        ...typography.labelSmall,
        color: colors.textMuted,
        textAlign: 'center',
        paddingBottom: spacing.xxl,
    },
});
