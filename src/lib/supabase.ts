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
                    created_at: string;
                };
                Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at'>;
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
        };
    };
};
