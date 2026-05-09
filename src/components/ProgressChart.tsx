import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Line, Circle, Polyline, Text as SvgText } from 'react-native-svg';
import { colors, typography } from '../theme';

export interface ProgressDataPoint {
    date: string;
    weight: number;
}

interface ProgressChartProps {
    data: ProgressDataPoint[];
    width?: number;
    height?: number;
    exerciseName?: string;
}

export default function ProgressChart({
    data,
    width = 320,
    height = 200,
    exerciseName = 'Exercise'
}: ProgressChartProps) {
    if (!data || data.length === 0) {
        return (
            <View style={[styles.container, { width, height }]}>
                <Text style={styles.noDataText}>No progress data available</Text>
            </View>
        );
    }

    // Chart dimensions with padding
    const padding = 40;
    const chartWidth = width - (padding * 2);
    const chartHeight = height - (padding * 2);

    // Find min/max values for scaling
    const weights = data.map(d => d.weight);
    const minWeight = Math.min(...weights);
    const maxWeight = Math.max(...weights);
    const weightRange = maxWeight - minWeight || 1; // Avoid division by zero

    // Add some padding to the weight range for better visualization
    const weightPadding = weightRange * 0.1;
    const scaledMinWeight = minWeight - weightPadding;
    const scaledMaxWeight = maxWeight + weightPadding;
    const scaledWeightRange = scaledMaxWeight - scaledMinWeight;

    // Convert data points to SVG coordinates
    const points = data.map((point, index) => {
        const x = padding + (index / (data.length - 1)) * chartWidth;
        const y = padding + chartHeight - ((point.weight - scaledMinWeight) / scaledWeightRange) * chartHeight;
        return { x, y, ...point };
    });

    // Create polyline points string for the line
    const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');

    // Format date for display (show only month/day)
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return `${date.getMonth() + 1}/${date.getDate()}`;
    };

    // Y-axis labels (weight values)
    const yAxisLabels = [];
    const labelCount = 4;
    for (let i = 0; i <= labelCount; i++) {
        const weight = scaledMinWeight + (scaledWeightRange * i / labelCount);
        const y = padding + chartHeight - (i / labelCount) * chartHeight;
        yAxisLabels.push({ weight: weight.toFixed(1), y });
    }

    return (
        <View style={[styles.container, { width, height }]}>
            <Text style={styles.title}>{exerciseName} Progress</Text>

            <Svg width={width} height={height - 30}>
                {/* Grid lines */}
                {yAxisLabels.map((label, index) => (
                    <Line
                        key={index}
                        x1={padding}
                        y1={label.y}
                        x2={padding + chartWidth}
                        y2={label.y}
                        stroke={colors.border}
                        strokeWidth="1"
                        opacity="0.3"
                    />
                ))}

                {/* Main chart line */}
                {points.length > 1 && (
                    <Polyline
                        points={polylinePoints}
                        fill="none"
                        stroke={colors.primary}
                        strokeWidth="2"
                    />
                )}

                {/* Data points */}
                {points.map((point, index) => (
                    <Circle
                        key={index}
                        cx={point.x}
                        cy={point.y}
                        r="4"
                        fill={colors.primary}
                        stroke={colors.background}
                        strokeWidth="2"
                    />
                ))}

                {/* Y-axis labels */}
                {yAxisLabels.map((label, index) => (
                    <SvgText
                        key={index}
                        x={padding - 10}
                        y={label.y + 4}
                        fontSize="12"
                        fill={colors.textMuted}
                        textAnchor="end"
                    >
                        {label.weight}
                    </SvgText>
                ))}

                {/* X-axis labels (dates) */}
                {points.map((point, index) => {
                    // Only show labels for first, middle, and last points to avoid crowding
                    const shouldShowLabel = index === 0 ||
                                          index === Math.floor(points.length / 2) ||
                                          index === points.length - 1;

                    if (!shouldShowLabel) return null;

                    return (
                        <SvgText
                            key={index}
                            x={point.x}
                            y={padding + chartHeight + 20}
                            fontSize="12"
                            fill={colors.textMuted}
                            textAnchor="middle"
                        >
                            {formatDate(point.date)}
                        </SvgText>
                    );
                })}
            </Svg>

            {/* Chart info */}
            <View style={styles.chartInfo}>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Current</Text>
                    <Text style={styles.statValue}>{data[data.length - 1]?.weight.toFixed(1)} kg</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Best</Text>
                    <Text style={styles.statValue}>{maxWeight.toFixed(1)} kg</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Sessions</Text>
                    <Text style={styles.statValue}>{data.length}</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        marginVertical: 8,
    },
    title: {
        ...typography.bodyLarge,
        color: colors.textPrimary,
        fontWeight: '600',
        marginBottom: 12,
        textAlign: 'center',
    },
    noDataText: {
        ...typography.bodyMedium,
        color: colors.textMuted,
        textAlign: 'center',
        flex: 1,
        textAlignVertical: 'center',
    },
    chartInfo: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    statItem: {
        alignItems: 'center',
    },
    statLabel: {
        ...typography.labelSmall,
        color: colors.textMuted,
        marginBottom: 2,
    },
    statValue: {
        ...typography.bodyMedium,
        color: colors.primary,
        fontWeight: '600',
    },
});