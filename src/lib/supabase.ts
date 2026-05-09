// LOCKOUT Supabase Client Configuration

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Supabase credentials from environment
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Custom storage adapter using SecureStore for sensitive data on native
// and AsyncStorage as fallback for web
const ExpoSecureStoreAdapter = {
    getItem: (key: string) => {
        if (Platform.OS === 'web') {
            if (typeof localStorage !== 'undefined') {
                return Promise.resolve(localStorage.getItem(key));
            }
            return Promise.resolve(null);
        }
        return SecureStore.getItemAsync(key);
    },
    setItem: (key: string, value: string) => {
        if (Platform.OS === 'web') {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(key, value);
            }
            return Promise.resolve();
        }
        return SecureStore.setItemAsync(key, value);
    },
    removeItem: (key: string) => {
        if (Platform.OS === 'web') {
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem(key);
            }
            return Promise.resolve();
        }
        return SecureStore.deleteItemAsync(key);
    },
};

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: ExpoSecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => {
    return Boolean(supabaseUrl && supabaseAnonKey);
};

// Database types (will be generated from schema later)
export type Database = {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string;
                    username: string | null;
                    avatar_url: string | null;
                    push_token: string | null;
                    current_streak: number;
                    longest_streak: number;
                    created_at: string;
                };
                Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'current_streak' | 'longest_streak'>;
                Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
            };
            squads: {
                Row: {
                    id: string;
                    name: string;
                    leader_id: string;
                    plan_tier: 'lite' | 'pro' | 'club';
                    member_limit: number;
                    invite_code: string;
                    created_at: string;
                };
                Insert: Omit<Database['public']['Tables']['squads']['Row'], 'id' | 'created_at' | 'invite_code'>;
                Update: Partial<Database['public']['Tables']['squads']['Insert']>;
            };
            squad_members: {
                Row: {
                    squad_id: string;
                    user_id: string;
                    joined_at: string;
                };
                Insert: Omit<Database['public']['Tables']['squad_members']['Row'], 'joined_at'>;
                Update: Partial<Database['public']['Tables']['squad_members']['Insert']>;
            };
            workouts: {
                Row: {
                    id: string;
                    user_id: string;
                    squad_id: string;
                    verification_level: 'check_in' | 'log' | 'tribunal';
                    points: number;
                    media_url: string | null;
                    thumbnail_url: string | null;
                    caption: string | null;
                    expires_at: string;
                    quest_id: string | null;
                    exercise_type: string | null;
                    weight_kg: number | null;
                    reps: number | null;
                    is_verified: boolean;
                    created_at: string;
                };
                Insert: Omit<Database['public']['Tables']['workouts']['Row'], 'id' | 'created_at' | 'points'>;
                Update: Partial<Database['public']['Tables']['workouts']['Insert']>;
            };
            votes: {
                Row: {
                    id: string;
                    workout_id: string;
                    user_id: string;
                    vote: 'valid' | 'cap';
                    created_at: string;
                };
                Insert: Omit<Database['public']['Tables']['votes']['Row'], 'id' | 'created_at'>;
                Update: Partial<Database['public']['Tables']['votes']['Insert']>;
            };
            quests: {
                Row: {
                    id: string;
                    squad_id: string;
                    description: string;
                    point_multiplier: number;
                    exercise_type: string | null;
                    expires_at: string;
                    created_at: string;
                };
                Insert: Omit<Database['public']['Tables']['quests']['Row'], 'id' | 'created_at'>;
                Update: Partial<Database['public']['Tables']['quests']['Insert']>;
            };
            schedule_events: {
                Row: {
                    id: string;
                    squad_id: string;
                    creator_id: string;
                    title: string;
                    description: string | null;
                    gym_location: string | null;
                    event_date: string;
                    start_time: string;
                    end_time: string | null;
                    max_participants: number;
                    created_at: string;
                };
                Insert: Omit<Database['public']['Tables']['schedule_events']['Row'], 'id' | 'created_at'>;
                Update: Partial<Database['public']['Tables']['schedule_events']['Insert']>;
            };
            event_participants: {
                Row: {
                    id: string;
                    event_id: string;
                    user_id: string;
                    status: 'joined' | 'pending' | 'declined';
                    joined_at: string;
                };
                Insert: Omit<Database['public']['Tables']['event_participants']['Row'], 'id' | 'joined_at'>;
                Update: Partial<Database['public']['Tables']['event_participants']['Insert']>;
            };
            custom_workouts: {
                Row: {
                    id: string;
                    user_id: string;
                    name: string;
                    description: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<Database['public']['Tables']['custom_workouts']['Row'], 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Database['public']['Tables']['custom_workouts']['Insert']>;
            };
            workout_exercises: {
                Row: {
                    id: string;
                    workout_id: string;
                    exercise_type: string;
                    sets: number;
                    reps_min: number;
                    reps_max: number;
                    rest_seconds: number;
                    notes: string | null;
                    order_index: number;
                };
                Insert: Omit<Database['public']['Tables']['workout_exercises']['Row'], 'id'>;
                Update: Partial<Database['public']['Tables']['workout_exercises']['Insert']>;
            };
            workout_logs: {
                Row: {
                    id: string;
                    user_id: string;
                    workout_id: string | null;
                    schedule_event_id: string | null;
                    logged_at: string;
                    duration_minutes: number | null;
                    notes: string | null;
                    completed: boolean;
                };
                Insert: Omit<Database['public']['Tables']['workout_logs']['Row'], 'id' | 'logged_at'>;
                Update: Partial<Database['public']['Tables']['workout_logs']['Insert']>;
            };
            exercise_logs: {
                Row: {
                    id: string;
                    workout_log_id: string;
                    exercise_type: string;
                    set_number: number;
                    weight_kg: number | null;
                    reps: number | null;
                    duration_seconds: number | null;
                    notes: string | null;
                };
                Insert: Omit<Database['public']['Tables']['exercise_logs']['Row'], 'id'>;
                Update: Partial<Database['public']['Tables']['exercise_logs']['Insert']>;
            };
            challenges: {
                Row: {
                    id: string;
                    squad_id: string;
                    title: string;
                    description: string;
                    challenge_type: 'individual' | 'group';
                    target_value: number;
                    current_value: number;
                    point_reward: number;
                    starts_at: string;
                    ends_at: string;
                    created_at: string;
                    is_active: boolean;
                };
                Insert: Omit<Database['public']['Tables']['challenges']['Row'], 'id' | 'created_at' | 'current_value'>;
                Update: Partial<Database['public']['Tables']['challenges']['Insert']>;
            };
            challenge_participants: {
                Row: {
                    id: string;
                    challenge_id: string;
                    user_id: string;
                    progress: number;
                    completed_at: string | null;
                    created_at: string;
                };
                Insert: Omit<Database['public']['Tables']['challenge_participants']['Row'], 'id' | 'created_at'>;
                Update: Partial<Database['public']['Tables']['challenge_participants']['Insert']>;
            };
        };
    };
};
