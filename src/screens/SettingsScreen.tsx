import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  Switch,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonActions } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { colors, typography } from '../theme';
import { supabase } from '../lib/supabase';

interface SettingsScreenProps {
  navigation: any;
}

interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  push_token: string | null;
}

export default function SettingsScreen({ navigation }: SettingsScreenProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [pushEnabled, setPushEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setEmail(user.email || '');

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        setUsername(profileData.username || '');
        setPushEnabled(!!profileData.push_token);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to upload an avatar.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingAvatar(true);
        await uploadAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadAvatar = async (uri: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create form data
      const formData = new FormData();
      formData.append('file', {
        uri,
        type: 'image/jpeg',
        name: `avatar-${user.id}.jpg`,
      } as any);

      // Upload to Supabase Storage
      const fileName = `avatars/${user.id}-${Date.now()}.jpg`;

      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      Alert.alert('Success', 'Avatar updated successfully!');
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      Alert.alert('Error', error.message || 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveUsername = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Username cannot be empty');
      return;
    }

    if (username.length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({ username: username.trim() })
        .eq('id', user.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, username: username.trim() } : null);
      Alert.alert('Success', 'Username updated successfully!');
    } catch (error: any) {
      console.error('Error updating username:', error);
      Alert.alert('Error', error.message || 'Failed to update username');
    } finally {
      setSaving(false);
    }
  };

  const handlePushToggle = async (enabled: boolean) => {
    setPushEnabled(enabled);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // In a real app, you'd register/unregister for push notifications here
      // For now, just update the database
      const { error } = await supabase
        .from('profiles')
        .update({ push_token: enabled ? 'enabled' : null })
        .eq('id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating push settings:', error);
      setPushEnabled(!enabled); // Revert on error
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              // Sign out from Supabase
              const { error } = await supabase.auth.signOut();

              if (error) {
                throw error;
              }

              // Clear any local state
              setProfile(null);
              setUsername('');
              setEmail('');
              setPushEnabled(false);

              // Reset navigation stack to prevent going back to authenticated screens
              // The auth state change listener in App.tsx will handle navigation to auth screens
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'Auth' }],
                })
              );
            } catch (error: any) {
              console.error('Logout error:', error);
              Alert.alert('Error', error.message || 'Failed to log out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      '⚠️ Delete Account',
      'This will permanently delete your account and all data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) throw new Error('Not authenticated');

              // Delete profile (cascade will remove related data)
              await supabase.from('profiles').delete().eq('id', user.id);
              await supabase.auth.signOut();

              Alert.alert('Account Deleted', 'Your account has been permanently deleted.');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete account');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SETTINGS</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.avatarContainer} onPress={handleAvatarUpload}>
            {uploadingAvatar ? (
              <View style={styles.avatar}>
                <ActivityIndicator size="small" color={colors.background} />
              </View>
            ) : profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {profile?.username?.[0]?.toUpperCase() || '?'}
                </Text>
              </View>
            )}
            <View style={styles.cameraIcon}>
              <Text style={styles.cameraEmoji}>📷</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Tap to change avatar</Text>
        </View>

        {/* Username Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>USERNAME</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={username}
              onChangeText={setUsername}
              placeholder="Enter username"
              placeholderTextColor={colors.textMuted}
              maxLength={20}
            />
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSaveUsername}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.inputHint}>3-20 characters, no spaces</Text>
        </View>

        {/* Account Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{email}</Text>
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Push Notifications</Text>
              <Text style={styles.settingDescription}>
                Get notified about tribunal votes, challenges, and squad activity
              </Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={handlePushToggle}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.textPrimary}
            />
          </View>
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
            <Text style={styles.deleteText}>Delete Account</Text>
          </TouchableOpacity>
        </View>

        {/* App Version */}
        <Text style={styles.version}>LOCKOUT v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    ...typography.bodyLarge,
    color: colors.primary,
  },
  headerTitle: {
    ...typography.labelLarge,
    color: colors.primary,
  },
  placeholder: {
    width: 50,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 24,
  },
  sectionTitle: {
    ...typography.labelSmall,
    color: colors.textMuted,
    marginBottom: 16,
  },
  avatarContainer: {
    alignSelf: 'center',
    position: 'relative',
    marginBottom: 8,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    ...typography.displaySmall,
    color: colors.background,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  cameraEmoji: {
    fontSize: 16,
  },
  avatarHint: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    ...typography.bodyLarge,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    ...typography.labelMedium,
    color: colors.background,
  },
  inputHint: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
  },
  infoLabel: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
  },
  infoValue: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  settingDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  logoutButton: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  logoutText: {
    ...typography.labelLarge,
    color: colors.textPrimary,
  },
  deleteButton: {
    backgroundColor: 'transparent',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.error,
  },
  deleteText: {
    ...typography.labelMedium,
    color: colors.error,
  },
  version: {
    ...typography.labelSmall,
    color: colors.textMuted,
    textAlign: 'center',
    paddingBottom: 40,
  },
});