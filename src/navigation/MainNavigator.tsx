import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';
import { colors, typography } from '../theme';

import HomeScreen from '../screens/HomeScreen';
import FitCheckScreen from '../screens/FitCheckScreen';
import TribunalUploadScreen from '../screens/TribunalUploadScreen';
import TribunalVoteScreen from '../screens/TribunalVoteScreen';
import SquadScreen from '../screens/SquadScreen';
import CreateSquadScreen from '../screens/CreateSquadScreen';
import JoinSquadScreen from '../screens/JoinSquadScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import PRLeaderboardScreen from '../screens/PRLeaderboardScreen';
import BodyStatsScreen from '../screens/BodyStatsScreen';
import StatsOverviewScreen from '../screens/StatsOverviewScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import CreateEventScreen from '../screens/CreateEventScreen';
import ProfileScreen from '../screens/ProfileScreen';
import WorkoutsScreen from '../screens/WorkoutsScreen';
import EditWorkoutScreen from '../screens/EditWorkoutScreen';
import ActiveWorkoutScreen from '../screens/ActiveWorkoutScreen';
import { Exercise } from '../data/exercises';

export type MainStackParamList = {
    MainTabs: undefined;
    FitCheck: undefined;
    TribunalUpload: undefined;
    TribunalVote: undefined;
    CreateSquad: undefined;
    JoinSquad: undefined;
    Profile: undefined;
    PRLeaderboard: { exercise: Exercise };
    BodyStats: undefined;
    StatsOverview: undefined;
    CreateEvent: { date: Date };
    EditWorkout: { workout?: any } | undefined;
    ActiveWorkout: { workout?: any; scheduleEventId?: string } | undefined;
};

export type TabParamList = {
    Home: undefined;
    Schedule: undefined;
    Workouts: undefined;
    Tribunal: undefined;
    Leaderboard: undefined;
    Squad: undefined;
};

const Stack = createNativeStackNavigator<MainStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Tab Icon Component
function TabIcon({ name, focused }: { name: string; focused: boolean }) {
    const icons: Record<string, string> = {
        Home: '🏠',
        Schedule: '📅',
        Workouts: '🏋️',
        Tribunal: '⚖️',
        Leaderboard: '🏆',
        Squad: '👥',
    };

    const labels: Record<string, string> = {
        Home: 'Home',
        Schedule: 'Schedule',
        Workouts: 'Workouts',
        Tribunal: 'Tribunal',
        Leaderboard: 'Rank',
        Squad: 'Squad',
    };

    return (
        <View style={styles.tabIcon}>
            <Text style={[styles.tabEmoji, focused && styles.tabEmojiActive]}>
                {icons[name] || '?'}
            </Text>
            <Text style={[styles.tabLabel, focused && styles.tabLabelActive]} numberOfLines={1}>
                {labels[name] || name}
            </Text>
        </View>
    );
}

// Tab Navigator
function MainTabs() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarStyle: styles.tabBar,
                tabBarShowLabel: false,
                tabBarIcon: ({ focused }) => (
                    <TabIcon name={route.name} focused={focused} />
                ),
            })}
        >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Schedule" component={ScheduleScreen} />
            <Tab.Screen name="Workouts" component={WorkoutsScreen} />
            <Tab.Screen name="Tribunal" component={TribunalVoteScreen} />
            <Tab.Screen name="Leaderboard" component={LeaderboardScreen} />
            <Tab.Screen name="Squad" component={SquadScreen} />
        </Tab.Navigator>
    );
}

// Main Stack Navigator
export default function MainNavigator() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
                animation: 'slide_from_bottom',
            }}
        >
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen
                name="FitCheck"
                component={FitCheckScreen}
                options={{ animation: 'fade' }}
            />
            <Stack.Screen
                name="TribunalUpload"
                component={TribunalUploadScreen}
                options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
                name="TribunalVote"
                component={TribunalVoteScreen}
                options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
                name="CreateSquad"
                component={CreateSquadScreen}
                options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
                name="JoinSquad"
                component={JoinSquadScreen}
                options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
                name="Profile"
                component={ProfileScreen}
                options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
                name="PRLeaderboard"
                component={PRLeaderboardScreen}
                options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
                name="BodyStats"
                component={BodyStatsScreen}
                options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
                name="StatsOverview"
                component={StatsOverviewScreen}
                options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
                name="CreateEvent"
                component={CreateEventScreen}
                options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
                name="EditWorkout"
                component={EditWorkoutScreen}
                options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
                name="ActiveWorkout"
                component={ActiveWorkoutScreen}
                options={{ animation: 'slide_from_bottom', gestureEnabled: false }}
            />
        </Stack.Navigator>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        height: 80,
        paddingBottom: 20,
        paddingTop: 10,
    },
    tabIcon: {
        alignItems: 'center',
        width: 70,
    },
    tabEmoji: {
        fontSize: 24,
        marginBottom: 4,
        opacity: 0.6,
    },
    tabEmojiActive: {
        opacity: 1,
    },
    tabLabel: {
        ...typography.labelSmall,
        color: colors.textMuted,
        fontSize: 10,
    },
    tabLabelActive: {
        color: colors.primary,
        fontWeight: '700',
    },
});
