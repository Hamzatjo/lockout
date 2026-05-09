import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    FlatList,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { colors, typography, spacing, borderRadius } from '../theme';
import { supabase, Database } from '../lib/supabase';

type Comment = Database['public']['Tables']['comments']['Row'] & {
    profiles: { username: string } | null;
};

interface CommentSectionProps {
    workoutId: string;
    initialCommentCount?: number;
}

export default function CommentSection({ workoutId, initialCommentCount = 0 }: CommentSectionProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [isExpanded, setIsExpanded] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [commentCount, setCommentCount] = useState(initialCommentCount);

    useEffect(() => {
        getCurrentUser();
        if (isExpanded) {
            fetchComments();
        }
    }, [isExpanded]);

    const getCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUserId(user?.id || null);
    };

    const fetchComments = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('comments')
                .select('*, profiles(username)')
                .eq('workout_id', workoutId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            setComments(data || []);
            setCommentCount(data?.length || 0);
        } catch (error) {
            console.error('Error fetching comments:', error);
        } finally {
            setLoading(false);
        }
    };

    const addComment = async () => {
        if (!newComment.trim() || !currentUserId) return;

        try {
            setSubmitting(true);
            const { data, error } = await supabase
                .from('comments')
                .insert({
                    workout_id: workoutId,
                    user_id: currentUserId,
                    text: newComment.trim(),
                })
                .select('*, profiles(username)')
                .single();

            if (error) throw error;

            if (data) {
                setComments(prev => [...prev, data]);
                setCommentCount(prev => prev + 1);
                setNewComment('');
            }
        } catch (error) {
            console.error('Error adding comment:', error);
            Alert.alert('Error', 'Failed to add comment. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const deleteComment = async (commentId: string) => {
        try {
            const { error } = await supabase
                .from('comments')
                .delete()
                .eq('id', commentId);

            if (error) throw error;

            setComments(prev => prev.filter(c => c.id !== commentId));
            setCommentCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error deleting comment:', error);
            Alert.alert('Error', 'Failed to delete comment. Please try again.');
        }
    };

    const confirmDeleteComment = (commentId: string) => {
        Alert.alert(
            'Delete Comment',
            'Are you sure you want to delete this comment?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteComment(commentId) },
            ]
        );
    };

    const formatTimestamp = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    const renderComment = ({ item }: { item: Comment }) => (
        <View style={styles.comment}>
            <View style={styles.commentHeader}>
                <Text style={styles.commentUsername}>
                    {item.profiles?.username || 'Unknown'}
                </Text>
                <View style={styles.commentHeaderRight}>
                    <Text style={styles.commentTimestamp}>
                        {formatTimestamp(item.created_at)}
                    </Text>
                    {item.user_id === currentUserId && (
                        <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => confirmDeleteComment(item.id)}
                        >
                            <Text style={styles.deleteButtonText}>×</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
            <Text style={styles.commentText}>{item.text}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Comment toggle button */}
            <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => setIsExpanded(!isExpanded)}
            >
                <Text style={styles.commentIcon}>💬</Text>
                <Text style={styles.toggleText}>
                    {commentCount === 0 ? 'Add comment' :
                     commentCount === 1 ? '1 comment' :
                     `${commentCount} comments`}
                </Text>
                <Text style={styles.expandIcon}>
                    {isExpanded ? '▲' : '▼'}
                </Text>
            </TouchableOpacity>

            {/* Expanded comment section */}
            {isExpanded && (
                <View style={styles.expandedSection}>
                    {/* Comments list */}
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="small" color={colors.primary} />
                        </View>
                    ) : comments.length > 0 ? (
                        <FlatList
                            data={comments}
                            renderItem={renderComment}
                            keyExtractor={(item) => item.id}
                            style={styles.commentsList}
                            scrollEnabled={false}
                        />
                    ) : (
                        <Text style={styles.noCommentsText}>
                            No comments yet. Be the first to comment!
                        </Text>
                    )}

                    {/* Add comment input */}
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Add a comment..."
                            placeholderTextColor={colors.textMuted}
                            value={newComment}
                            onChangeText={setNewComment}
                            multiline
                            maxLength={500}
                            editable={!submitting}
                        />
                        <TouchableOpacity
                            style={[
                                styles.submitButton,
                                (!newComment.trim() || submitting) && styles.submitButtonDisabled
                            ]}
                            onPress={addComment}
                            disabled={!newComment.trim() || submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator size="small" color={colors.background} />
                            ) : (
                                <Text style={styles.submitButtonText}>Post</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    toggleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        gap: spacing.xs,
    },
    commentIcon: {
        fontSize: 16,
    },
    toggleText: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
        flex: 1,
    },
    expandIcon: {
        ...typography.bodySmall,
        color: colors.textMuted,
    },
    expandedSection: {
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.md,
    },
    loadingContainer: {
        paddingVertical: spacing.md,
        alignItems: 'center',
    },
    commentsList: {
        maxHeight: 200,
        marginBottom: spacing.md,
    },
    comment: {
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    commentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    commentUsername: {
        ...typography.labelMedium,
        color: colors.textPrimary,
        fontWeight: '600',
    },
    commentHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    commentTimestamp: {
        ...typography.labelSmall,
        color: colors.textMuted,
    },
    deleteButton: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: colors.error + '20',
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteButtonText: {
        ...typography.labelSmall,
        color: colors.error,
        fontWeight: '700',
        fontSize: 14,
    },
    commentText: {
        ...typography.bodyMedium,
        color: colors.textPrimary,
        lineHeight: 18,
    },
    noCommentsText: {
        ...typography.bodyMedium,
        color: colors.textMuted,
        textAlign: 'center',
        paddingVertical: spacing.md,
        fontStyle: 'italic',
    },
    inputContainer: {
        flexDirection: 'row',
        gap: spacing.sm,
        alignItems: 'flex-end',
    },
    textInput: {
        flex: 1,
        backgroundColor: colors.surfaceLight,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        ...typography.bodyMedium,
        color: colors.textPrimary,
        maxHeight: 80,
        minHeight: 40,
    },
    submitButton: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        minWidth: 60,
        alignItems: 'center',
        justifyContent: 'center',
        height: 40,
    },
    submitButtonDisabled: {
        backgroundColor: colors.textMuted,
        opacity: 0.5,
    },
    submitButtonText: {
        ...typography.labelMedium,
        color: colors.background,
        fontWeight: '600',
    },
});