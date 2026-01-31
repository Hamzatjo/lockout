// LOCKOUT Media Viewer Modal - Expandable full-screen media

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Modal,
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { colors, typography, spacing, borderRadius } from '../theme';

const { width, height } = Dimensions.get('window');

type Props = {
    visible: boolean;
    mediaUrl: string;
    isVideo: boolean;
    caption?: string;
    username?: string;
    onClose: () => void;
};

export default function MediaViewer({
    visible,
    mediaUrl,
    isVideo,
    caption,
    username,
    onClose
}: Props) {
    const [loading, setLoading] = useState(true);

    // Create video player for video content
    const player = useVideoPlayer(isVideo && visible ? mediaUrl : null, player => {
        player.loop = true;
        player.play();
    });

    // Auto-hide loader after 2 seconds as fallback
    useEffect(() => {
        if (visible) {
            setLoading(true);
            const timer = setTimeout(() => setLoading(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [visible, mediaUrl]);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                {/* Close button */}
                <TouchableOpacity
                    style={styles.closeButton}
                    onPress={onClose}
                    hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                >
                    <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>

                {/* Username */}
                {username && (
                    <View style={styles.header}>
                        <Text style={styles.username}>@{username}</Text>
                    </View>
                )}

                {/* Media */}
                <View style={styles.mediaContainer}>
                    {loading && (
                        <ActivityIndicator
                            size="large"
                            color={colors.primary}
                            style={styles.loader}
                        />
                    )}

                    {isVideo ? (
                        <VideoView
                            player={player}
                            style={styles.media}
                            allowsFullscreen
                            allowsPictureInPicture
                            contentFit="contain"
                        />
                    ) : (
                        <Image
                            source={{ uri: mediaUrl }}
                            style={styles.media}
                            resizeMode="contain"
                            onLoad={() => setLoading(false)}
                            onError={() => setLoading(false)}
                        />
                    )}
                </View>

                {/* Caption */}
                {caption && (
                    <View style={styles.captionContainer}>
                        <Text style={styles.caption}>{caption}</Text>
                    </View>
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.95)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButton: {
        position: 'absolute',
        top: 60,
        right: 20,
        zIndex: 10,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.overlay,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeText: {
        fontSize: 24,
        color: colors.textPrimary,
    },
    header: {
        position: 'absolute',
        top: 60,
        left: 20,
    },
    username: {
        ...typography.labelLarge,
        color: colors.textPrimary,
    },
    mediaContainer: {
        width: width,
        height: height * 0.7,
        justifyContent: 'center',
        alignItems: 'center',
    },
    media: {
        width: '100%',
        height: '100%',
    },
    loader: {
        position: 'absolute',
    },
    captionContainer: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
        backgroundColor: colors.overlay,
        padding: spacing.md,
        borderRadius: borderRadius.md,
    },
    caption: {
        ...typography.bodyLarge,
        color: colors.textPrimary,
        textAlign: 'center',
    },
});
