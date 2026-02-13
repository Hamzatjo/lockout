import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import Svg, { Path, G, Ellipse, Circle, Rect } from 'react-native-svg';
import { colors, typography, spacing, borderRadius } from '../theme';
import { MuscleGroup } from '../data/exercises';

type MuscleRank = {
    muscleGroup: MuscleGroup;
    rank: number;
    totalMembers: number;
    percentile: number;
};

type Props = {
    muscleRanks: MuscleRank[];
    size?: number;
    onMusclePress?: (muscle: MuscleGroup) => void;
};

function getColorForRank(rank: number, total: number): string {
    if (total <= 1) return colors.primary;
    const percentile = ((total - rank) / (total - 1)) * 100;
    if (percentile >= 80) return '#00FF87';
    if (percentile >= 60) return '#7FFF00';
    if (percentile >= 40) return '#FFD700';
    if (percentile >= 20) return '#FFA500';
    return '#FF6B6B';
}

function getRankForMuscle(muscleGroup: MuscleGroup, ranks: MuscleRank[]): MuscleRank | undefined {
    return ranks.find(r => r.muscleGroup === muscleGroup);
}

export default function BodyVisual({ muscleRanks, size = 300, onMusclePress }: Props) {
    const [view, setView] = useState<'front' | 'back'>('front');

    const getMuscleColor = (muscleGroup: MuscleGroup): string => {
        const rank = getRankForMuscle(muscleGroup, muscleRanks);
        if (!rank) return '#2A2A2A';
        return getColorForRank(rank.rank, rank.totalMembers);
    };

    const strokeColor = '#1A1A1A';
    const strokeWidth = 1.5;

    const frontView = (
        <G transform="translate(75, 10)">
            <Ellipse cx="75" cy="28" rx="22" ry="26" fill="#4A4A4A" stroke={strokeColor} strokeWidth={strokeWidth} />
            
            <Path
                d="M60 52 Q58 60 52 68 L38 78 Q32 82 32 92 L32 108 Q32 114 38 114 L42 114 Q46 114 46 108 L46 90 Q46 86 50 84 L58 80 L58 72"
                fill={getMuscleColor('shoulders')}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
            />
            <Path
                d="M90 52 Q92 60 98 68 L112 78 Q118 82 118 92 L118 108 Q118 114 112 114 L108 114 Q104 114 104 108 L104 90 Q104 86 100 84 L92 80 L92 72"
                fill={getMuscleColor('shoulders')}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
            />
            
            <Path
                d="M58 72 L50 84 Q46 88 46 96 L46 124 Q46 130 52 130 L56 130 Q60 130 60 124 L60 102 Q60 98 64 96 L68 94 L68 82"
                fill={getMuscleColor('biceps')}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
            />
            <Path
                d="M92 72 L100 84 Q104 88 104 96 L104 124 Q104 130 98 130 L94 130 Q90 130 90 124 L90 102 Q90 98 86 96 L82 94 L82 82"
                fill={getMuscleColor('biceps')}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
            />
            
            <Path
                d="M46 96 L36 106 Q30 114 30 126 L30 150 Q30 158 36 158 L40 158 Q44 158 44 152 L44 130 L46 124"
                fill={getMuscleColor('triceps')}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
            />
            <Path
                d="M104 96 L114 106 Q120 114 120 126 L120 150 Q120 158 114 158 L110 158 Q106 158 106 152 L106 130 L104 124"
                fill={getMuscleColor('triceps')}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
            />
            
            <Path
                d="M58 52 L58 82 L58 130 Q58 140 66 145 L75 148 L84 145 Q92 140 92 130 L92 82 L92 52 Q85 56 75 56 Q65 56 58 52"
                fill={getMuscleColor('chest')}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
            />
            
            <Path
                d="M58 130 L58 175 Q58 185 66 192 L75 198 L84 192 Q92 185 92 175 L92 130 Q85 135 75 135 Q65 135 58 130"
                fill={getMuscleColor('core')}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
            />
            
            <Path
                d="M58 175 L48 188 Q38 200 38 220 L38 290 Q38 305 48 315 L58 322 L58 350 Q58 358 50 360 L48 360 Q42 360 42 354 L42 330 L38 325 Q30 318 30 305 L30 220 Q30 198 42 182 L58 175"
                fill={getMuscleColor('legs')}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
            />
            <Path
                d="M92 175 L102 188 Q112 200 112 220 L112 290 Q112 305 102 315 L92 322 L92 350 Q92 358 100 360 L102 360 Q108 360 108 354 L108 330 L112 325 Q120 318 120 305 L120 220 Q120 198 108 182 L92 175"
                fill={getMuscleColor('legs')}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
            />
            
            <Rect x="26" y="155" width="18" height="22" rx="4" fill="#4A4A4A" stroke={strokeColor} strokeWidth={strokeWidth} />
            <Rect x="106" y="155" width="18" height="22" rx="4" fill="#4A4A4A" stroke={strokeColor} strokeWidth={strokeWidth} />
            <Rect x="54" y="355" width="16" height="12" rx="3" fill="#4A4A4A" stroke={strokeColor} strokeWidth={strokeWidth} />
            <Rect x="80" y="355" width="16" height="12" rx="3" fill="#4A4A4A" stroke={strokeColor} strokeWidth={strokeWidth} />
        </G>
    );

    const backView = (
        <G transform="translate(75, 10)">
            <Ellipse cx="75" cy="28" rx="22" ry="26" fill="#4A4A4A" stroke={strokeColor} strokeWidth={strokeWidth} />
            
            <Path
                d="M60 52 Q58 60 52 68 L38 78 Q32 82 32 92 L32 108 Q32 114 38 114 L42 114 Q46 114 46 108 L46 90 Q46 86 50 84 L58 80 L58 72"
                fill={getMuscleColor('shoulders')}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
            />
            <Path
                d="M90 52 Q92 60 98 68 L112 78 Q118 82 118 92 L118 108 Q118 114 112 114 L108 114 Q104 114 104 108 L104 90 Q104 86 100 84 L92 80 L92 72"
                fill={getMuscleColor('shoulders')}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
            />
            
            <Path
                d="M58 52 L58 130 Q58 140 66 145 L75 148 L84 145 Q92 140 92 130 L92 52 Q85 56 75 56 Q65 56 58 52"
                fill={getMuscleColor('back')}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
            />
            
            <Path
                d="M58 72 L50 84 Q46 88 46 96 L46 124 Q46 130 52 130 L56 130 Q60 130 60 124 L60 102 Q60 98 64 96 L68 94 L68 82"
                fill={getMuscleColor('triceps')}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
            />
            <Path
                d="M92 72 L100 84 Q104 88 104 96 L104 124 Q104 130 98 130 L94 130 Q90 130 90 124 L90 102 Q90 98 86 96 L82 94 L82 82"
                fill={getMuscleColor('triceps')}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
            />
            
            <Path
                d="M46 96 L36 106 Q30 114 30 126 L30 150 Q30 158 36 158 L40 158 Q44 158 44 152 L44 130 L46 124"
                fill={getMuscleColor('triceps')}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
            />
            <Path
                d="M104 96 L114 106 Q120 114 120 126 L120 150 Q120 158 114 158 L110 158 Q106 158 106 152 L106 130 L104 124"
                fill={getMuscleColor('triceps')}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
            />
            
            <Path
                d="M58 130 L58 175 Q58 185 66 192 L75 198 L84 192 Q92 185 92 175 L92 130 Q85 135 75 135 Q65 135 58 130"
                fill={getMuscleColor('core')}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
            />
            
            <Path
                d="M58 175 L48 188 Q38 200 38 220 L38 290 Q38 305 48 315 L58 322 L58 350 Q58 358 50 360 L48 360 Q42 360 42 354 L42 330 L38 325 Q30 318 30 305 L30 220 Q30 198 42 182 L58 175"
                fill={getMuscleColor('legs')}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
            />
            <Path
                d="M92 175 L102 188 Q112 200 112 220 L112 290 Q112 305 102 315 L92 322 L92 350 Q92 358 100 360 L102 360 Q108 360 108 354 L108 330 L112 325 Q120 318 120 305 L120 220 Q120 198 108 182 L92 175"
                fill={getMuscleColor('legs')}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
            />
            
            <Rect x="26" y="155" width="18" height="22" rx="4" fill="#4A4A4A" stroke={strokeColor} strokeWidth={strokeWidth} />
            <Rect x="106" y="155" width="18" height="22" rx="4" fill="#4A4A4A" stroke={strokeColor} strokeWidth={strokeWidth} />
            <Rect x="54" y="355" width="16" height="12" rx="3" fill="#4A4A4A" stroke={strokeColor} strokeWidth={strokeWidth} />
            <Rect x="80" y="355" width="16" height="12" rx="3" fill="#4A4A4A" stroke={strokeColor} strokeWidth={strokeWidth} />
        </G>
    );

    return (
        <View style={styles.container}>
            <View style={styles.viewToggle}>
                <TouchableOpacity
                    style={[styles.toggleButton, view === 'front' && styles.toggleActive]}
                    onPress={() => setView('front')}
                >
                    <Text style={[styles.toggleText, view === 'front' && styles.toggleTextActive]}>FRONT</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.toggleButton, view === 'back' && styles.toggleActive]}
                    onPress={() => setView('back')}
                >
                    <Text style={[styles.toggleText, view === 'back' && styles.toggleTextActive]}>BACK</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.bodyFrame}>
                <Svg width={size} height={size * 1.3} viewBox="0 0 300 390">
                    {view === 'front' ? frontView : backView}
                </Svg>
            </View>

            <View style={styles.legend}>
                <View style={styles.legendRow}>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#00FF87' }]} />
                        <Text style={styles.legendLabel}>Top 20%</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#7FFF00' }]} />
                        <Text style={styles.legendLabel}>Top 40%</Text>
                    </View>
                </View>
                <View style={styles.legendRow}>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#FFD700' }]} />
                        <Text style={styles.legendLabel}>Top 60%</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#FF6B6B' }]} />
                        <Text style={styles.legendLabel}>Bottom</Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
    },
    viewToggle: {
        flexDirection: 'row',
        backgroundColor: '#1A1A1A',
        borderRadius: borderRadius.md,
        padding: 4,
        marginBottom: spacing.md,
    },
    toggleButton: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.sm,
    },
    toggleActive: {
        backgroundColor: colors.primary,
    },
    toggleText: {
        ...typography.labelSmall,
        color: colors.textMuted,
    },
    toggleTextActive: {
        color: colors.background,
        fontWeight: '700',
    },
    bodyFrame: {
        backgroundColor: '#0A0A0A',
        borderRadius: borderRadius.xl,
        padding: spacing.md,
        borderWidth: 2,
        borderColor: '#1A1A1A',
    },
    legend: {
        marginTop: spacing.md,
    },
    legendRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.lg,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: spacing.xs,
    },
    legendLabel: {
        ...typography.labelSmall,
        color: colors.textMuted,
        fontSize: 10,
    },
});
