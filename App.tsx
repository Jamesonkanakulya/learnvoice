import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider, Text } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import AppNavigator from './src/navigation/AppNavigator';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { useAppStore } from './src/store/useAppStore';
import { lightTheme, darkTheme } from './src/theme';
import { getUserStats } from './src/services/data';
import { initDatabase } from './src/services/data/initDatabase';

const ONBOARDING_KEY = 'learnvoice_onboarded';

async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(ONBOARDING_KEY) === 'true';
    }
    const val = await SecureStore.getItemAsync(ONBOARDING_KEY);
    return val === 'true';
  } catch {
    return true; // Skip onboarding on error
  }
}

async function markOnboardingComplete(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(ONBOARDING_KEY, 'true');
    } else {
      await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
    }
  } catch {}
}

export default function App() {
  const isDarkMode = useAppStore((s) => s.isDarkMode);
  const setDbReady = useAppStore((s) => s.setDbReady);
  const setUserStats = useAppStore((s) => s.setUserStats);
  const isDbReady = useAppStore((s) => s.isDbReady);
  const [error, setError] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState('Starting...');
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        setLoadingStatus('Initializing database...');
        await initDatabase();

        setLoadingStatus('Loading stats...');
        const stats = await getUserStats();
        setUserStats(stats);

        // Check onboarding
        const onboarded = await hasCompletedOnboarding();
        if (!onboarded) {
          setShowOnboarding(true);
        }

        setLoadingStatus('Ready!');
        setDbReady(true);
      } catch (e: any) {
        console.error('Init error:', e);
        setError(e.message || String(e) || 'Failed to initialize');
      }
    }
    init();
  }, []);

  const theme = isDarkMode ? darkTheme : lightTheme;

  if (error) {
    return (
      <PaperProvider theme={theme}>
        <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
          <Text style={{ color: '#FF4444', textAlign: 'center', padding: 32, fontSize: 16 }}>
            Error: {error}
          </Text>
          <Text style={{ color: '#999', textAlign: 'center', padding: 16, fontSize: 12 }}>
            Platform: {Platform.OS}
          </Text>
        </View>
      </PaperProvider>
    );
  }

  if (!isDbReady) {
    return (
      <PaperProvider theme={theme}>
        <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ marginTop: 16, color: theme.colors.onSurfaceVariant }}>
            Loading LearnVoice...
          </Text>
          <Text style={{ marginTop: 8, color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
            {loadingStatus}
          </Text>
        </View>
      </PaperProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        {showOnboarding ? (
          <OnboardingScreen onComplete={async () => {
            await markOnboardingComplete();
            setShowOnboarding(false);
          }} />
        ) : (
          <AppNavigator />
        )}
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
