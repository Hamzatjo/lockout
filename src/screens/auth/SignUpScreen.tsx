// LOCKOUT Sign Up Screen

import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
    ScrollView,
} from 'react-native';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { supabase } from '../../lib/supabase';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Props = {
    navigation: NativeStackNavigationProp<any>;
};

export default function SignUpScreen({ navigation }: Props) {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);

    const handleSignUp = async () => {
        if (!username || !email || !password || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        if (!acceptedTerms) {
            Alert.alert('Error', 'Please accept the terms of service');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username,
                },
            },
        });
        setLoading(false);

        if (error) {
            Alert.alert('Sign Up Failed', error.message);
        } else {
            Alert.alert(
                'Check Your Email',
                'We sent you a confirmation link. Click it to activate your account.',
                [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
            );
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.content}>
                    {/* Header */}
                    <Text style={styles.title}>JOIN THE</Text>
                    <Text style={styles.titleAccent}>TRIBUNAL</Text>
                    <Text style={styles.subtitle}>CREATE YOUR ACCOUNT</Text>

                    {/* Form */}
                    <View style={styles.form}>
                        <TextInput
                            style={styles.input}
                            placeholder="Username"
                            placeholderTextColor={colors.textMuted}
                            value={username}
                            onChangeText={setUsername}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            placeholderTextColor={colors.textMuted}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            autoCorrect={false}
                        />
                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={styles.passwordInput}
                                placeholder="Password"
                                placeholderTextColor={colors.textMuted}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity
                                style={styles.passwordToggle}
                                onPress={() => setShowPassword(!showPassword)}
                            >
                                <Text style={styles.passwordToggleText}>
                                    {showPassword ? '🙈' : '👁️'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={styles.passwordInput}
                                placeholder="Confirm Password"
                                placeholderTextColor={colors.textMuted}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={!showConfirmPassword}
                            />
                            <TouchableOpacity
                                style={styles.passwordToggle}
                                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                <Text style={styles.passwordToggleText}>
                                    {showConfirmPassword ? '🙈' : '👁️'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.termsContainer}
                            onPress={() => setAcceptedTerms(!acceptedTerms)}
                        >
                            <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
                                {acceptedTerms && <Text style={styles.checkmark}>✓</Text>}
                            </View>
                            <Text style={styles.termsText}>
                                I accept the Terms of Service and Privacy Policy
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={handleSignUp}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={colors.background} />
                            ) : (
                                <Text style={styles.buttonText}>CREATE ACCOUNT</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Login Link */}
                    <TouchableOpacity
                        style={styles.linkContainer}
                        onPress={() => navigation.navigate('Login')}
                    >
                        <Text style={styles.linkText}>
                            Already have an account?{' '}
                            <Text style={styles.linkTextBold}>Log In</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: spacing.lg,
    },
    title: {
        ...typography.displayMedium,
        color: colors.textPrimary,
        textAlign: 'center',
    },
    titleAccent: {
        ...typography.displayLarge,
        color: colors.primary,
        textAlign: 'center',
        marginBottom: spacing.xs,
    },
    subtitle: {
        ...typography.labelSmall,
        color: colors.textMuted,
        textAlign: 'center',
        marginBottom: spacing.xl,
        letterSpacing: 2,
    },
    form: {
        gap: spacing.md,
    },
    input: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        color: colors.textPrimary,
        ...typography.bodyLarge,
        borderWidth: 1,
        borderColor: colors.border,
    },
    passwordContainer: {
        position: 'relative',
    },
    passwordInput: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        paddingRight: 50,
        color: colors.textPrimary,
        ...typography.bodyLarge,
        borderWidth: 1,
        borderColor: colors.border,
    },
    passwordToggle: {
        position: 'absolute',
        right: spacing.md,
        top: spacing.md,
        padding: 4,
    },
    passwordToggleText: {
        fontSize: 18,
    },
    termsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.sm,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderWidth: 2,
        borderColor: colors.border,
        borderRadius: 4,
        marginRight: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    checkmark: {
        color: colors.background,
        fontSize: 12,
        fontWeight: '700',
    },
    termsText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        flex: 1,
    },
    button: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        alignItems: 'center',
        marginTop: spacing.sm,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        ...typography.labelLarge,
        color: colors.background,
    },
    linkContainer: {
        marginTop: spacing.xl,
        alignItems: 'center',
    },
    linkText: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
    },
    linkTextBold: {
        color: colors.primary,
        fontWeight: '700',
    },
});
