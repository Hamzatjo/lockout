import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { colors, typography } from '../../theme';

interface WelcomeScreenProps {
  navigation: any;
}

export default function WelcomeScreen({ navigation }: WelcomeScreenProps) {
  const handleGetStarted = () => {
    navigation.navigate('SquadChoice');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.logo}>💪</Text>
          <Text style={styles.title}>LOCKOUT</Text>
          <Text style={styles.subtitle}>BeReal meets workout tracking</Text>
        </View>

        <View style={styles.features}>
          <View style={styles.feature}>
            <Text style={styles.featureEmoji}>📸</Text>
            <Text style={styles.featureTitle}>Authentic Check-ins</Text>
            <Text style={styles.featureDescription}>
              No fake gym selfies. Real workouts, real accountability.
            </Text>
          </View>

          <View style={styles.feature}>
            <Text style={styles.featureEmoji}>👥</Text>
            <Text style={styles.featureTitle}>Squad Accountability</Text>
            <Text style={styles.featureDescription}>
              Join your crew. Vote on workouts. Keep each other honest.
            </Text>
          </View>

          <View style={styles.feature}>
            <Text style={styles.featureEmoji}>🏆</Text>
            <Text style={styles.featureTitle}>Compete & Progress</Text>
            <Text style={styles.featureDescription}>
              Track PRs, build streaks, and climb the leaderboard.
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.getStartedButton} onPress={handleGetStarted}>
          <Text style={styles.getStartedText}>GET STARTED</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingTop: height * 0.1,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
  },
  logo: {
    fontSize: 80,
    marginBottom: 16,
  },
  title: {
    ...typography.displayLarge,
    color: colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  features: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  feature: {
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  featureEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  featureTitle: {
    ...typography.headlineMedium,
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  featureDescription: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  getStartedButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  getStartedText: {
    ...typography.labelLarge,
    color: colors.background,
  },
});