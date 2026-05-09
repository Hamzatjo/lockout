// LOCKOUT Splash Screen

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors, typography } from '../theme';

type Props = {
    onAnimationComplete?: () => void;
};

export default function SplashScreen({ onAnimationComplete }: Props) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;

    useEffect(() => {
        // Start animation sequence
        Animated.sequence([
            // Fade in and scale up logo
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ]),
            // Hold for a moment
            Animated.delay(600),
            // Fade out
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
            }),
        ]).start(() => {
            // Animation complete
            onAnimationComplete?.();
        });
    }, [fadeAnim, scaleAnim, onAnimationComplete]);

    return (
        <View style={styles.container}>
            <Animated.View
                style={[
                    styles.logoContainer,
                    {
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }],
                    },
                ]}
            >
                <Text style={styles.logo}>LOCKOUT</Text>
                <Text style={styles.tagline}>FITNESS ACCOUNTABILITY</Text>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoContainer: {
        alignItems: 'center',
    },
    logo: {
        ...typography.displayLarge,
        fontSize: 48,
        fontWeight: '900',
        color: colors.primary,
        letterSpacing: 4,
        marginBottom: 8,
    },
    tagline: {
        ...typography.labelMedium,
        color: colors.textMuted,
        letterSpacing: 2,
    },
});