import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { colors, typography } from '../../theme';

interface SquadChoiceScreenProps {
  navigation: any;
}

export default function SquadChoiceScreen({ navigation }: SquadChoiceScreenProps) {
  const handleCreateSquad = () => {
    navigation.navigate('CreateSquad');
  };

  const handleJoinSquad = () => {
    navigation.navigate('JoinSquad');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.emoji}>👥</Text>
          <Text style={styles.title}>Join Your Squad</Text>
          <Text style={styles.subtitle}>
            LOCKOUT is all about accountability. You need a squad to get started.
          </Text>
        </View>

        <View style={styles.options}>
          <TouchableOpacity style={styles.primaryOption} onPress={handleCreateSquad}>
            <View style={styles.optionContent}>
              <Text style={styles.optionEmoji}>⚡</Text>
              <Text style={styles.optionTitle}>Create Squad</Text>
              <Text style={styles.optionDescription}>
                Start fresh with your crew. You'll be the squad leader.
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryOption} onPress={handleJoinSquad}>
            <View style={styles.optionContent}>
              <Text style={styles.optionEmoji}>🔗</Text>
              <Text style={styles.optionTitle}>Join Squad</Text>
              <Text style={styles.optionDescription}>
                Got an invite code? Join an existing squad.
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            You can always switch squads later in settings
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 24,
  },
  title: {
    ...typography.displayMedium,
    color: colors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  options: {
    flex: 1,
    justifyContent: 'center',
    gap: 20,
  },
  primaryOption: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 24,
  },
  secondaryOption: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionContent: {
    alignItems: 'center',
  },
  optionEmoji: {
    fontSize: 40,
    marginBottom: 16,
  },
  optionTitle: {
    ...typography.headlineMedium,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  optionDescription: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    alignItems: 'center',
    marginTop: 40,
  },
  footerText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
  },
});