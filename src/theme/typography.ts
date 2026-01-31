// LOCKOUT Typography - Bold, Condensed, Gym Aesthetic

import { Platform } from 'react-native';

const fontFamily = Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'System',
});

export const typography = {
    // Display - For big headers like "CHECK IN"
    displayLarge: {
        fontFamily,
        fontSize: 48,
        fontWeight: '900' as const,
        letterSpacing: -1,
        lineHeight: 52,
    },
    displayMedium: {
        fontFamily,
        fontSize: 36,
        fontWeight: '800' as const,
        letterSpacing: -0.5,
        lineHeight: 40,
    },
    displaySmall: {
        fontFamily,
        fontSize: 28,
        fontWeight: '700' as const,
        letterSpacing: 0,
        lineHeight: 32,
    },

    // Headlines
    headlineLarge: {
        fontFamily,
        fontSize: 24,
        fontWeight: '700' as const,
        letterSpacing: 0,
        lineHeight: 28,
    },
    headlineMedium: {
        fontFamily,
        fontSize: 20,
        fontWeight: '600' as const,
        letterSpacing: 0,
        lineHeight: 24,
    },
    headlineSmall: {
        fontFamily,
        fontSize: 18,
        fontWeight: '600' as const,
        letterSpacing: 0,
        lineHeight: 22,
    },

    // Body
    bodyLarge: {
        fontFamily,
        fontSize: 16,
        fontWeight: '400' as const,
        letterSpacing: 0.5,
        lineHeight: 22,
    },
    bodyMedium: {
        fontFamily,
        fontSize: 14,
        fontWeight: '400' as const,
        letterSpacing: 0.25,
        lineHeight: 20,
    },
    bodySmall: {
        fontFamily,
        fontSize: 12,
        fontWeight: '400' as const,
        letterSpacing: 0.4,
        lineHeight: 16,
    },

    // Labels - For buttons and UI elements
    labelLarge: {
        fontFamily,
        fontSize: 16,
        fontWeight: '700' as const,
        letterSpacing: 1,
        lineHeight: 20,
        textTransform: 'uppercase' as const,
    },
    labelMedium: {
        fontFamily,
        fontSize: 14,
        fontWeight: '600' as const,
        letterSpacing: 0.5,
        lineHeight: 18,
    },
    labelSmall: {
        fontFamily,
        fontSize: 12,
        fontWeight: '500' as const,
        letterSpacing: 0.5,
        lineHeight: 14,
    },

    // Points/Stats - For leaderboard numbers
    stats: {
        fontFamily,
        fontSize: 32,
        fontWeight: '900' as const,
        letterSpacing: -1,
        lineHeight: 36,
    },
    statsSmall: {
        fontFamily,
        fontSize: 24,
        fontWeight: '800' as const,
        letterSpacing: -0.5,
        lineHeight: 28,
    },
} as const;

export type TypographyKey = keyof typeof typography;
