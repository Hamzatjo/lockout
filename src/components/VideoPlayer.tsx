// LOCKOUT Video Player Component

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { colors, borderRadius } from '../theme';

type Props = {
    uri: string;
    style?: ViewStyle;
    autoPlay?: boolean;
    loop?: boolean;
    muted?: boolean;
    showControls?: boolean;
    onPlaybackStatusUpdate?: (status: AVPlaybackStatus) => void;
};

export default function VideoPlayer({
    uri,
    style,
    autoPlay = false,
    loop = true,
    muted = false,
    showControls = true,
    onPlaybackStatusUpdate,
}: Props) {
    return (
        <View style={[styles.container, style]}>
            <Video
                source={{ uri }}
                style={styles.video}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={autoPlay}
                isLooping={loop}
                isMuted={muted}
                useNativeControls={showControls}
                onPlaybackStatusUpdate={onPlaybackStatusUpdate}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
    },
    video: {
        flex: 1,
    },
});
