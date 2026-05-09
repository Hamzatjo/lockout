import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, typography } from '../theme';
import { supabase } from '../lib/supabase';

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
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import SquadChoiceScreen from '../screens/onboarding/SquadChoiceScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ChallengesScreen from '../screens/ChallengesScreen';
import WorkoutHistoryScreen from '../screens/WorkoutHistoryScreen';
import ExerciseProgressScreen from '../screens/ExerciseProgressScreen';
import WeeklySummaryScreen from '../screens/WeeklySummaryScreen';
import { Exercise } from '../data/exercises';

export type MainStackParamList = {
    MainTabs: undefined;
    Welcome: undefined;
    SquadChoice: undefined;
    FitCheck: undefined;
    TribunalUpload: undefined;
    TribunalVote: undefined;
    CreateSquad: undefined;
    JoinSquad: undefined;
    Profile: undefined;
    Settings: undefined;
    PRLeaderboard: { exercise: Exercise };
    BodyStats: undefined;
    StatsOverview: undefined;
    CreateEvent: { date: Date };
    EditWorkout: { workout?: any } | undefined;
    ActiveWorkout: { workout?: any; scheduleEventId?: string } | undefined;
    WorkoutHistory: undefined;
    ExerciseProgress: { exercise?: Exercise } | undefined;
    WeeklySummary: undefined;
};

export type TabParamList = {
    Home: undefined;
    Schedule: undefined;
    Workouts: undefined;
    Challenges: undefined;
    Leaderboard: undefined;
    Squad: undefined;
};

const Stack = createNativeStackNavigator<MainStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Tab Icon Component
function TabIcon({ name, focused, badge }: { name: string; focused: boolean; badge?: number }) {
    const icons: Record<string, string> = {
        Home: '🏠',
        Schedule: '📅',
        Workouts: '🏋️',
        Challenges: '🏆',
        Leaderboard: '📊',
        Squad: '👥',
    };

    const labels: Record<string, string> = {
        Home: 'Home',
        Schedule: 'Schedule',
        Workouts: 'Workouts',
        Challenges: 'Challenges',
        Leaderboard: 'Rank',
        Squad: 'Squad',
    };

    return (
        <View style={styles.tabIcon}>
            <View style={styles.tabIconContainer}>
                <Text style={[styles.tabEmoji, focused && styles.tabEmojiActive]}>
                    {icons[name] || '?'}
                </Text>
                {badge && badge > 0 && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                            {badge > 99 ? '99+' : badge.toString()}
                        </Text>
                    </View>
                )}
            </View>
            <Text style={[styles.tabLabel, focused && styles.tabLabelActive]} numberOfLines={1}>
                {labels[name] || name}
            </Text>
        </View>
    );
}

// Tab Navigator
function MainTabs() {
    const [challengesBadge, setChallengesBadge] = useState(0);
    const [squadBadge, setSquadBadge] = useState(0);

    const fetchBadgeCounts = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get user's squad
            const { data: membership } = await supabase
                .from('squad_members')
                .select('squad_id')
                .eq('user_id', user.id)
                .single();

            if (!membership) return;

            // Count active challenges
            const { count: activeChallenges } = await supabase
                .from('challenges')
                .select('*', { count: 'exact', head: true })
                .eq('squad_id', membership.squad_id)
                .eq('is_active', true);

            setChallengesBadge(activeChallenges || 0);

            // Count pending tribunal votes (workouts in tribunal that user hasn't voted on)
            const { data: tribunalWorkouts } = await supabase
                .from('workouts')
                .select('id')
                .eq('squad_id', membership.squad_id)
                .eq('verification_level', 'tribunal')
                .eq('is_verified', false);

            if (tribunalWorkouts && tribunalWorkouts.length > 0) {
                const workoutIds = tribunalWorkouts.map(w => w.id);

                // Get votes by current user for these workouts
                const { data: userVotes } = await supabase
                    .from('votes')
                    .select('workout_id')
                    .eq('user_id', user.id)
                    .in('workout_id', workoutIds);

                const votedWorkoutIds = new Set(userVotes?.map(v => v.workout_id) || []);
                const pendingVotes = tribunalWorkouts.filter(w => !votedWorkoutIds.has(w.id));

                setSquadBadge(pendingVotes.length);
            } else {
                setSquadBadge(0);
            }
        } catch (error) {
            console.error('Error fetching badge counts:', error);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            fetchBadgeCounts();
        }, [])
    );

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarStyle: styles.tabBar,
                tabBarShowLabel: false,
                tabBarIcon: ({ focused }) => {
                    let badge: number | undefined;

                    if (route.name === 'Challenges') {
                        badge = challengesBadge;
                    } else if (route.name === 'Squad') {
                        badge = squadBadge;
                    }

                    return (
                        <TabIcon name={route.name} focused={focused} badge={badge} />
                    );
                },
            })}
        >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Schedule" component={ScheduleScreen} />
            <Tab.Screen name="Workouts" component={WorkoutsScreen} />
            <Tab.Screen name="Challenges" component={ChallengesScreen} />
            <Tab.Screen name="Leaderboard" component={LeaderboardScreen} />
            <Tab.Screen name="Squad" component={SquadScreen} />
        </Tab.Navigator>
    );
}

// Main Stack Navigator
export default function MainNavigator() {
    const [hasSquad, setHasSquad] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkSquadMembership();
    }, []);

    const checkSquadMembership = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setHasSquad(false);
                setLoading(false);
                return;
            }

            const { data: membership } = await supabase
                .from('squad_members')
                .select('squad_id')
                .eq('user_id', user.id)
                .single();

            setHasSquad(!!membership);
        } catch (error) {
            console.error('Error checking squad membership:', error);
            setHasSquad(false);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
                animation: 'slide_from_bottom',
            }}
            initialRouteName={hasSquad ? 'MainTabs' : 'Welcome'}
        >
            {/* Onboarding Screens */}
            <Stack.Screen
                name="Welcome"
                component={WelcomeScreen}
                options={{ animation: 'fade' }}
            />
            <Stack.Screen
                name="SquadChoice"
                component={SquadChoiceScreen}
                options={{ animation: 'slide_from_right' }}
            />

            {/* Main App */}
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
            <Stack.Screen
                name="WorkoutHistory"
                component={WorkoutHistoryScreen}
                options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
                name="ExerciseProgress"
                component={ExerciseProgressScreen}
                options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
                name="WeeklySummary"
                component={WeeklySummaryScreen}
                options={{ animation: 'slide_from_right' }}
            />
        </Stack.Navigator>
    );
}

const styles = StyleSheet.create({
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
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
    tabIconContainer: {
        position: 'relative',
        alignItems: 'center',
    },
    tabEmoji: {
        fontSize: 24,
        marginBottom: 4,
        opacity: 0.6,
    },
    tabEmojiActive: {
        opacity: 1,
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -8,
        backgroundColor: colors.error,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        color: colors.textPrimary,
        fontSize: 10,
        fontWeight: '700',
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
