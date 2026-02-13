import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    FlatList,
    TextInput,
    Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '../theme';
import {
    Exercise,
    MuscleGroup,
    EXERCISES,
    MUSCLE_GROUP_LABELS,
    MUSCLE_GROUP_ICONS,
    MUSCLE_GROUPS,
    getExercisesByMuscleGroup,
} from '../data/exercises';

type Props = {
    visible: boolean;
    onSelect: (exercise: Exercise) => void;
    onClose: () => void;
};

export default function ExercisePicker({ visible, onSelect, onClose }: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedGroups, setExpandedGroups] = useState<Set<MuscleGroup>>(
        new Set(MUSCLE_GROUPS)
    );

    const toggleGroup = (group: MuscleGroup) => {
        const newExpanded = new Set(expandedGroups);
        if (newExpanded.has(group)) {
            newExpanded.delete(group);
        } else {
            newExpanded.add(group);
        }
        setExpandedGroups(newExpanded);
    };

    const filteredExercises = searchQuery
        ? EXERCISES.filter(ex =>
            ex.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : null;

    const handleSelect = (exercise: Exercise) => {
        setSearchQuery('');
        onSelect(exercise);
    };

    const renderMuscleGroup = ({ item: group }: { item: MuscleGroup }) => {
        const isExpanded = expandedGroups.has(group);
        const exercises = getExercisesByMuscleGroup(group);

        return (
            <View style={styles.groupContainer}>
                <TouchableOpacity
                    style={styles.groupHeader}
                    onPress={() => toggleGroup(group)}
                >
                    <Text style={styles.groupIcon}>{MUSCLE_GROUP_ICONS[group]}</Text>
                    <Text style={styles.groupName}>{MUSCLE_GROUP_LABELS[group]}</Text>
                    <Text style={styles.groupCount}>{exercises.length}</Text>
                    <Text style={styles.expandIcon}>{isExpanded ? '−' : '+'}</Text>
                </TouchableOpacity>

                {isExpanded && (
                    <View style={styles.exercisesList}>
                        {exercises.map(exercise => (
                            <TouchableOpacity
                                key={exercise.id}
                                style={styles.exerciseItem}
                                onPress={() => handleSelect(exercise)}
                            >
                                <Text style={styles.exerciseName}>{exercise.name}</Text>
                                <Text style={styles.chevron}>›</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>
        );
    };

    const renderSearchResult = ({ item }: { item: Exercise }) => (
        <TouchableOpacity
            style={styles.searchResultItem}
            onPress={() => handleSelect(item)}
        >
            <Text style={styles.groupIcon}>{MUSCLE_GROUP_ICONS[item.muscleGroup]}</Text>
            <View style={styles.searchResultText}>
                <Text style={styles.exerciseName}>{item.name}</Text>
                <Text style={styles.exerciseMuscle}>{MUSCLE_GROUP_LABELS[item.muscleGroup]}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose}>
                        <Text style={styles.closeButton}>✕</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Select Exercise</Text>
                    <View style={styles.placeholder} />
                </View>

                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search exercises..."
                        placeholderTextColor={colors.textMuted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCorrect={false}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity
                            style={styles.clearButton}
                            onPress={() => setSearchQuery('')}
                        >
                            <Text style={styles.clearButtonText}>✕</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {filteredExercises ? (
                    <FlatList
                        data={filteredExercises}
                        renderItem={renderSearchResult}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.list}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyEmoji}>🔍</Text>
                                <Text style={styles.emptyText}>No exercises found</Text>
                            </View>
                        }
                    />
                ) : (
                    <FlatList
                        data={MUSCLE_GROUPS}
                        renderItem={renderMuscleGroup}
                        keyExtractor={item => item}
                        contentContainerStyle={styles.list}
                    />
                )}
            </SafeAreaView>
        </Modal>
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
    closeButton: {
        fontSize: 24,
        color: colors.textPrimary,
    },
    headerTitle: {
        ...typography.labelLarge,
        color: colors.primary,
    },
    placeholder: {
        width: 24,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        margin: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    searchInput: {
        flex: 1,
        padding: spacing.md,
        color: colors.textPrimary,
        ...typography.bodyMedium,
    },
    clearButton: {
        padding: spacing.md,
    },
    clearButtonText: {
        color: colors.textMuted,
        fontSize: 16,
    },
    list: {
        padding: spacing.md,
    },
    groupContainer: {
        marginBottom: spacing.sm,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        overflow: 'hidden',
    },
    groupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
    },
    groupIcon: {
        fontSize: 20,
        marginRight: spacing.md,
    },
    groupName: {
        ...typography.labelLarge,
        color: colors.textPrimary,
        flex: 1,
    },
    groupCount: {
        ...typography.bodySmall,
        color: colors.textMuted,
        marginRight: spacing.sm,
    },
    expandIcon: {
        fontSize: 20,
        color: colors.textMuted,
        fontWeight: '600',
    },
    exercisesList: {
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    exerciseItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        paddingLeft: spacing.xl + spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    exerciseName: {
        ...typography.bodyMedium,
        color: colors.textPrimary,
        flex: 1,
    },
    chevron: {
        fontSize: 20,
        color: colors.textMuted,
    },
    searchResultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        marginBottom: spacing.sm,
    },
    searchResultText: {
        flex: 1,
        marginLeft: spacing.md,
    },
    exerciseMuscle: {
        ...typography.bodySmall,
        color: colors.textMuted,
        marginTop: 2,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing.xxl,
    },
    emptyEmoji: {
        fontSize: 48,
        marginBottom: spacing.md,
    },
    emptyText: {
        ...typography.bodyMedium,
        color: colors.textMuted,
    },
});
