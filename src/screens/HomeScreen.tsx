import React, { useCallback, useState, useRef, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Animated, Pressable, Dimensions } from 'react-native';
import { Text, useTheme, ProgressBar, Surface, Button } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { RootStackParamList, UserStats, Deck, SessionResult } from '../types';
import { getUserStats, getDecksWithDueQuestions, getAllDecks, getRecentSessions } from '../services/data';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [dueDecks, setDueDecks] = useState<(Deck & { dueCount: number })[]>([]);
  const [recentDeck, setRecentDeck] = useState<Deck | null>(null);
  const [allDecks, setAllDecks] = useState<Deck[]>([]);
  const [recentSessions, setRecentSessions] = useState<SessionResult[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const streakPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
    ]).start();
  }, []);

  const loadData = useCallback(async () => {
    const [s, due, sessions, decks] = await Promise.all([
      getUserStats(),
      getDecksWithDueQuestions(),
      getRecentSessions(5),
      getAllDecks(),
    ]);
    setStats(s);
    setDueDecks(due);
    setRecentSessions(sessions);
    setAllDecks(decks);
    if (sessions.length > 0) {
      const recent = decks.find((d) => d.id === sessions[0].deckId);
      setRecentDeck(recent || null);
    } else if (decks.length > 0) {
      setRecentDeck(decks[0]);
    }

    if (s.currentStreak > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(streakPulse, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
          Animated.timing(streakPulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const motivationalQuote = () => {
    const quotes = [
      'Every expert was once a beginner.',
      'Small steps every day lead to big results.',
      'Knowledge is power. Keep learning!',
      'Your brain is a muscle. Train it daily.',
      'Consistency beats intensity.',
      'The more you learn, the more you earn.',
    ];
    return quotes[new Date().getDate() % quotes.length];
  };

  const xpForCurrentLevel = (level: number) => {
    let total = 0;
    let threshold = 100;
    for (let i = 1; i < level; i++) {
      total += threshold;
      threshold = Math.floor(threshold * 1.5);
    }
    return { total, threshold };
  };

  const levelInfo = stats ? xpForCurrentLevel(stats.level) : { total: 0, threshold: 100 };
  const xpInLevel = stats ? stats.xpPoints - levelInfo.total : 0;
  const levelProgress = Math.min(1, xpInLevel / levelInfo.threshold);

  const hasNoData = !stats || (stats.totalQuestionsAnswered === 0 && allDecks.length === 0);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Header */}
      <Animated.View style={[styles.heroSection, {
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }]}>
        <View style={[styles.heroBg, { backgroundColor: theme.colors.primary }]}>
          <View style={styles.heroPattern}>
            {[...Array(6)].map((_, i) => (
              <View key={i} style={[styles.heroCircle, {
                width: 60 + i * 30,
                height: 60 + i * 30,
                borderRadius: 30 + i * 15,
                opacity: 0.05 + i * 0.01,
                top: -10 + i * 5,
                right: -20 + i * 10,
              }]} />
            ))}
          </View>
          <View style={styles.heroContent}>
            <Text variant="bodyLarge" style={{ color: 'rgba(255,255,255,0.8)' }}>
              {greeting()}
            </Text>
            <Text variant="headlineLarge" style={styles.heroTitle}>
              LearnVoice
            </Text>
            <Text variant="bodyMedium" style={{ color: 'rgba(255,255,255,0.7)', marginTop: 4, fontStyle: 'italic' }}>
              {motivationalQuote()}
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Quick Stats Row */}
      {stats && stats.totalQuestionsAnswered > 0 && (
        <Animated.View style={[styles.quickStats, {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        }]}>
          <Surface style={[styles.quickStatsCard, { backgroundColor: theme.colors.surface }]} elevation={2}>
            <View style={styles.quickStatsRow}>
              <Animated.View style={[styles.streakBadge, {
                backgroundColor: stats.currentStreak > 0 ? '#FF980020' : theme.colors.surfaceVariant,
                transform: [{ scale: streakPulse }],
              }]}>
                <MaterialIcons
                  name="local-fire-department"
                  size={28}
                  color={stats.currentStreak > 0 ? '#FF9800' : theme.colors.onSurfaceVariant}
                />
                <Text variant="titleMedium" style={{
                  fontWeight: 'bold',
                  color: stats.currentStreak > 0 ? '#FF9800' : theme.colors.onSurfaceVariant,
                }}>
                  {stats.currentStreak}
                </Text>
              </Animated.View>

              <View style={styles.quickStatsDivider} />

              <View style={styles.levelSection}>
                <View style={styles.levelHeader}>
                  <View style={[styles.levelBadge, { backgroundColor: theme.colors.primary }]}>
                    <Text variant="labelLarge" style={{ color: theme.colors.onPrimary, fontWeight: 'bold' }}>
                      {stats.level}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      Level {stats.level}
                    </Text>
                    <ProgressBar
                      progress={levelProgress}
                      color={theme.colors.primary}
                      style={styles.levelBar}
                    />
                  </View>
                  <Text variant="labelSmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                    {stats.xpPoints} XP
                  </Text>
                </View>
              </View>
            </View>
          </Surface>
        </Animated.View>
      )}

      {/* Welcome Card for New Users */}
      {hasNoData && (
        <Animated.View style={{ opacity: fadeAnim, paddingHorizontal: 16, marginTop: -8 }}>
          <Surface style={[styles.welcomeCard, { backgroundColor: theme.colors.primaryContainer }]} elevation={0}>
            <MaterialIcons name="school" size={48} color={theme.colors.primary} />
            <Text variant="titleLarge" style={{ fontWeight: 'bold', marginTop: 16, textAlign: 'center' }}>
              Welcome to LearnVoice!
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 8, lineHeight: 22 }}>
              Create your first deck and start learning with smart flashcards, spaced repetition, and voice interaction.
            </Text>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('CreateDeck')}
              style={{ marginTop: 20, borderRadius: 12 }}
              contentStyle={{ height: 48 }}
              icon="plus"
            >
              Create Your First Deck
            </Button>
          </Surface>
        </Animated.View>
      )}

      {/* Continue Learning */}
      {recentDeck && (
        <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Continue Learning
          </Text>
          <Pressable
            onPress={() => navigation.navigate('DeckDetail', { deckId: recentDeck.id })}
            style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
          >
            <Surface style={[styles.continueDeck, { backgroundColor: theme.colors.surface }]} elevation={2}>
              <View style={[styles.continueIcon, { backgroundColor: recentDeck.color + '20' }]}>
                <MaterialIcons name={recentDeck.icon as any} size={32} color={recentDeck.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{recentDeck.name}</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                  {recentDeck.questionCount} questions
                </Text>
              </View>
              <View style={[styles.playButton, { backgroundColor: theme.colors.primary }]}>
                <MaterialIcons name="play-arrow" size={24} color={theme.colors.onPrimary} />
              </View>
            </Surface>
          </Pressable>
        </Animated.View>
      )}

      {/* Due for Review */}
      {dueDecks.length > 0 && (
        <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
          <View style={styles.sectionHeaderRow}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground, marginBottom: 0 }]}>
              Due for Review
            </Text>
            <View style={[styles.dueBadge, { backgroundColor: '#FF444420' }]}>
              <Text variant="labelSmall" style={{ color: '#FF4444', fontWeight: 'bold' }}>
                {dueDecks.reduce((sum, d) => sum + d.dueCount, 0)} cards
              </Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, marginTop: 12 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
            {dueDecks.map((deck) => (
              <Pressable
                key={deck.id}
                onPress={() => navigation.navigate('StudySession', { deckId: deck.id })}
                style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
              >
                <Surface style={[styles.dueCard, { backgroundColor: theme.colors.surface }]} elevation={2}>
                  <View style={[styles.dueIconBg, { backgroundColor: deck.color + '15' }]}>
                    <MaterialIcons name={deck.icon as any} size={28} color={deck.color} />
                  </View>
                  <Text variant="bodyMedium" style={{ fontWeight: 'bold', marginTop: 8 }} numberOfLines={1}>
                    {deck.name}
                  </Text>
                  <View style={[styles.dueCountBadge, { backgroundColor: theme.colors.primary + '15' }]}>
                    <Text variant="labelSmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                      {deck.dueCount} due
                    </Text>
                  </View>
                </Surface>
              </Pressable>
            ))}
          </ScrollView>
        </Animated.View>
      )}

      {/* Stats Overview */}
      {stats && stats.totalQuestionsAnswered > 0 && (
        <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Your Progress
          </Text>
          <View style={styles.statsGrid}>
            <Surface style={[styles.statCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
              <View style={[styles.statIconBg, { backgroundColor: '#6C63FF15' }]}>
                <MaterialIcons name="help-outline" size={22} color="#6C63FF" />
              </View>
              <Text variant="titleLarge" style={{ fontWeight: 'bold', marginTop: 8 }}>
                {stats.totalQuestionsAnswered}
              </Text>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Questions</Text>
            </Surface>

            <Surface style={[styles.statCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
              <View style={[styles.statIconBg, { backgroundColor: '#4CAF5015' }]}>
                <MaterialIcons name="check-circle-outline" size={22} color="#4CAF50" />
              </View>
              <Text variant="titleLarge" style={{ fontWeight: 'bold', marginTop: 8 }}>
                {Math.round(stats.overallAccuracy)}%
              </Text>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Accuracy</Text>
            </Surface>

            <Surface style={[styles.statCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
              <View style={[styles.statIconBg, { backgroundColor: '#2196F315' }]}>
                <MaterialIcons name="timer" size={22} color="#2196F3" />
              </View>
              <Text variant="titleLarge" style={{ fontWeight: 'bold', marginTop: 8 }}>
                {Math.round(stats.totalStudyTimeMinutes)}m
              </Text>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Study Time</Text>
            </Surface>

            <Surface style={[styles.statCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
              <View style={[styles.statIconBg, { backgroundColor: '#FFD70015' }]}>
                <MaterialIcons name="emoji-events" size={22} color="#FFD700" />
              </View>
              <Text variant="titleLarge" style={{ fontWeight: 'bold', marginTop: 8 }}>
                {stats.longestStreak}
              </Text>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Best Streak</Text>
            </Surface>
          </View>
        </Animated.View>
      )}

      {/* Recent Activity */}
      {recentSessions.length > 0 && (
        <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Recent Activity
          </Text>
          {recentSessions.slice(0, 3).map((session, i) => {
            const date = new Date(session.completedAt);
            const timeStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            const duration = Math.round((session.completedAt - session.startedAt) / 60000);
            const scoreColor = session.averageScore >= 80 ? '#4CAF50' : session.averageScore >= 50 ? '#FF9800' : '#FF4444';

            return (
              <Surface key={i} style={[styles.activityCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
                <View style={[styles.activityScoreBar, { backgroundColor: scoreColor }]} />
                <View style={styles.activityContent}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium" style={{ fontWeight: '600' }}>{session.deckName}</Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                      {session.answeredQuestions} questions  {duration}m  {timeStr}
                    </Text>
                  </View>
                  <View style={[styles.activityScore, { backgroundColor: scoreColor + '15' }]}>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold', color: scoreColor }}>
                      {session.averageScore}%
                    </Text>
                  </View>
                </View>
              </Surface>
            );
          })}
        </Animated.View>
      )}

      {/* Quick Actions */}
      {allDecks.length > 0 && (
        <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Quick Actions
          </Text>
          <View style={styles.actionsRow}>
            <Pressable
              onPress={() => navigation.navigate('CreateDeck')}
              style={({ pressed }) => [styles.actionCard, { backgroundColor: theme.colors.surface, opacity: pressed ? 0.8 : 1 }]}
            >
              <View style={[styles.actionIconBg, { backgroundColor: '#6C63FF15' }]}>
                <MaterialIcons name="add-circle-outline" size={24} color="#6C63FF" />
              </View>
              <Text variant="labelMedium" style={{ fontWeight: '600', marginTop: 6 }}>New Deck</Text>
            </Pressable>

            <Pressable
              onPress={() => navigation.navigate('MainTabs', { screen: 'Decks' } as any)}
              style={({ pressed }) => [styles.actionCard, { backgroundColor: theme.colors.surface, opacity: pressed ? 0.8 : 1 }]}
            >
              <View style={[styles.actionIconBg, { backgroundColor: '#4CAF5015' }]}>
                <MaterialIcons name="library-books" size={24} color="#4CAF50" />
              </View>
              <Text variant="labelMedium" style={{ fontWeight: '600', marginTop: 6 }}>My Decks</Text>
            </Pressable>

            <Pressable
              onPress={() => navigation.navigate('MainTabs', { screen: 'Stats' } as any)}
              style={({ pressed }) => [styles.actionCard, { backgroundColor: theme.colors.surface, opacity: pressed ? 0.8 : 1 }]}
            >
              <View style={[styles.actionIconBg, { backgroundColor: '#FF980015' }]}>
                <MaterialIcons name="insights" size={24} color="#FF9800" />
              </View>
              <Text variant="labelMedium" style={{ fontWeight: '600', marginTop: 6 }}>Statistics</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroSection: { marginBottom: 16 },
  heroBg: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingTop: 56,
    paddingBottom: 32,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  heroPattern: { position: 'absolute', top: 0, right: 0, bottom: 0 },
  heroCircle: { position: 'absolute', backgroundColor: 'white' },
  heroContent: {},
  heroTitle: { color: 'white', fontWeight: 'bold', marginTop: 4, fontSize: 32 },
  quickStats: { paddingHorizontal: 16, marginTop: -16, marginBottom: 8 },
  quickStatsCard: { borderRadius: 16, padding: 16 },
  quickStatsRow: { flexDirection: 'row', alignItems: 'center' },
  streakBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 56,
    borderRadius: 16,
    gap: 2,
  },
  quickStatsDivider: { width: 1, height: 40, backgroundColor: '#E0E0E8', marginHorizontal: 14 },
  levelSection: { flex: 1 },
  levelHeader: { flexDirection: 'row', alignItems: 'center' },
  levelBadge: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  levelBar: { height: 6, borderRadius: 3, marginTop: 4 },
  welcomeCard: { borderRadius: 20, padding: 28, alignItems: 'center', marginBottom: 16 },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontWeight: 'bold', marginBottom: 12 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  continueDeck: { borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  continueIcon: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  playButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  dueBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  dueCard: { width: 130, borderRadius: 14, padding: 14, alignItems: 'center', marginRight: 12 },
  dueIconBg: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  dueCountBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, marginTop: 8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '47%', flexGrow: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  statIconBg: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  activityCard: { borderRadius: 12, marginBottom: 8, overflow: 'hidden', flexDirection: 'row' },
  activityScoreBar: { width: 4 },
  activityContent: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  activityScore: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  actionsRow: { flexDirection: 'row', gap: 12 },
  actionCard: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  actionIconBg: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
});
