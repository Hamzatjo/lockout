// LOCKOUT Check In Button Component

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';

type Props = {
    onPress: () => void;
    style?: ViewStyle;
    variant?: 'primary' | 'secondary';
    size?: 'small' | 'medium' | 'large';
};

export default function CheckInButton({
    onPress,
    style,
    variant = 'primary',
    size = 'large',
}: Props) {
    const isPrimary = variant === 'primary';
    const sizeStyles = {
        small: { padding: spacing.sm, fontSize: 12 },
        medium: { padding: spacing.md, fontSize: 14 },
        large: { padding: spacing.lg, fontSize: 16 },
    };

    return (
        <TouchableOpacity
            style={[
                styles.button,
                isPrimary ? styles.buttonPrimary : styles.buttonSecondary,
                { padding: sizeStyles[size].padding },
                isPrimary && shadows.glow,
                style,
            ]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <Text style={styles.emoji}>📸</Text>
            <Text
                style={[
                    styles.text,
                    isPrimary ? styles.textPrimary : styles.textSecondary,
                    { fontSize: sizeStyles[size].fontSize },
                ]}
            >
                CHECK IN
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: borderRadius.lg,
        gap: spacing.sm,
    },
    buttonPrimary: {
        backgroundColor: colors.primary,
    },
    buttonSecondary: {
        backgroundColor: colors.surface,
        borderWidth: 2,
        borderColor: colors.primary,
    },
    emoji: {
        fontSize: 24,
    },
    text: {
        ...typography.labelLarge,
        fontWeight: '800',
    },
    textPrimary: {
        color: colors.background,
    },
    textSecondary: {
        color: colors.primary,
    },
});
