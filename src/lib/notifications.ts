// LOCKOUT Push Notifications Setup

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure notification behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

// Request permissions and get push token
export async function registerForPushNotifications(): Promise<string | null> {
    let token: string | null = null;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#00FF87',
        });
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('Failed to get push token - permission denied');
            return null;
        }

        token = (await Notifications.getExpoPushTokenAsync()).data;
    } else {
        console.log('Push notifications require a physical device');
    }

    return token;
}

// Save push token to user profile
export async function savePushToken(token: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
        .from('profiles')
        .update({ push_token: token })
        .eq('id', user.id);
}

// Initialize push notifications for the app
export async function initializePushNotifications(): Promise<void> {
    const token = await registerForPushNotifications();
    if (token) {
        await savePushToken(token);
    }
}

// Send a push notification (for testing)
export async function sendLocalNotification(
    title: string,
    body: string,
    data?: Record<string, unknown>
): Promise<void> {
    await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            data,
            sound: true,
        },
        trigger: null, // Immediate
    });
}

// Notification types for the app
export type NotificationType =
    | 'new_tribunal' // New workout needs voting
    | 'vote_result' // Your workout was judged
    | 'squad_invite' // Someone joined your squad
    | 'weekly_summary'; // Commissioner AI summary

// Handle notification response (when user taps)
export function setupNotificationResponseHandler(
    onNotificationResponse: (response: Notifications.NotificationResponse) => void
): () => void {
    const subscription = Notifications.addNotificationResponseReceivedListener(onNotificationResponse);
    return () => subscription.remove();
}
