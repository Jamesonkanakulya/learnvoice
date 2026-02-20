import React, { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Text, Surface, useTheme, Divider } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { UserStats, SessionResult, RootStackParamList } from '../types';
import { getUserStats, getRecentSessions } from '../services/data';
import { getUnlockedCount, ACHIEVEMENTS } from '../services/achievements/achievementService';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function StatsScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [sessions, setSessions] = useState<SessionResult[]>([]);
  const [achievementCount, setAchievementCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      Promise.all([getUserStats(), getRecentSessions(20)]).then(([s, sess]) => {
        setStats(s);
        setSessions(sess);
      });
      setAchievementCount(getUnlockedCount());
    }, [])
  );

  if (!stats) return null;

  const xpForLevel = (level: number) => {
    let threshold = 100;
    for (let i = 1; i < level; i++) threshold = Math.floor(threshold * 1.5);
    return threshold;
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={{ fontWeight: 'bold', color: theme.colors.onBackground }}>
          Statistics
        </Text>
      </View>

      {/* Level Card */}
      <Surface style={[styles.levelCard, { backgroundColor: theme.colors.primaryContainer }]} elevation={0}>
        <View style={styles.levelRow}>
          <View style={[styles.levelBadge, { backgroundColor: theme.colors.primary }]}>
            <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: theme.colors.onPrimary }}>
              {stats.level}
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>Level {stats.level}</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {stats.xpPoints} XP total - {xpForLevel(stats.level)} XP to next level
            </Text>
          </View>
        </View>
      </Surface>

      {/* Achievements Quick View */}
      <Pressable
        onPress={() => navigation.navigate('Achievements' as any)}
        style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
      >
        <Surface style={[styles.achievementCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
          <MaterialIcons name="emoji-events" size={28} color="#FFD700" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>Achievements</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {achievementCount} of {ACHIEVEMENTS.length} unlocked
            </Text>
          </View>
          <View style={[styles.achievementProgress, { backgroundColor: theme.colors.surfaceVariant }]}>
            <View style={[styles.achievementFill, {
              backgroundColor: '#FFD700',
              width: `${(achievementCount / ACHIEVEMENTS.length) * 100}%`,
            }]} />
          </View>
          <MaterialIcons name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
        </Surface>
      </Pressable>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard
          icon="help-outline"
          iconColor="#6C63FF"
          value={stats.totalQuestionsAnswered.toString()}
          label="Questions Answered"
          theme={theme}
        />
        <StatCard
          icon="check-circle-outline"
          iconColor="#4CAF50"
          value={`${Math.round(stats.overallAccuracy)}%`}
          label="Accuracy"
          theme={theme}
        />
        <StatCard
          icon="local-fire-department"
          iconColor="#FF9800"
          value={stats.currentStreak.toString()}
          label="Current Streak"
          theme={theme}
        />
        <StatCard
          icon="emoji-events"
          iconColor="#FFD700"
          value={stats.longestStreak.toString()}
          label="Longest Streak"
          theme={theme}
        />
        <StatCard
          icon="timer"
          iconColor="#2196F3"
          value={`${Math.round(stats.totalStudyTimeMinutes)}m`}
          label="Study Time"
          theme={theme}
        />
        <StatCard
          icon="star"
          iconColor="#9C27B0"
          value={stats.xpPoints.toString()}
          label="Total XP"
          theme={theme}
        />
      </View>

      {/* Recent Sessions */}
      {sessions.length > 0 && (
        <View style={styles.section}>
          <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 12 }}>
            Recent Sessions
          </Text>
          {sessions.map((session, i) => {
            const date = new Date(session.completedAt);
            const timeStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            const duration = Math.round((session.completedAt - session.startedAt) / 60000);

            return (
              <View key={i}>
                <View style={styles.sessionRow}>
                  <View style={[styles.sessionDot, {
                    backgroundColor: session.averageScore >= 70 ? '#4CAF50' : session.averageScore >= 50 ? '#FF9800' : '#FF4444'
                  }]} />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium" style={{ fontWeight: '600' }}>{session.deckName}</Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {session.answeredQuestions} questions - {duration}m - {timeStr}
                    </Text>
                  </View>
                  <Text variant="titleMedium" style={{
                    fontWeight: 'bold',
                    color: session.averageScore >= 70 ? '#4CAF50' : '#FF9800'
                  }}>
                    {session.averageScore}%
                  </Text>
                </View>
                {i < sessions.length - 1 && <Divider style={{ marginVertical: 4 }} />}
              </View>
            );
          })}
        </View>
      )}

      {stats.totalQuestionsAnswered === 0 && (
        <View style={styles.empty}>
          <MaterialIcons name="bar-chart" size={64} color={theme.colors.onSurfaceVariant} />
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, marginTop: 16, textAlign: 'center' }}>
            No study data yet.{'\n'}Complete a study session to see your stats!
          </Text>
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function StatCard({ icon, iconColor, value, label, theme }: {
  icon: string; iconColor: string; value: string; label: string; theme: any;
}) {
  return (
    <Surface style={[styles.statItem, { backgroundColor: theme.colors.surface }]} elevation={1}>
      <View style={[styles.statIconBg, { backgroundColor: iconColor + '15' }]}>
        <MaterialIcons name={icon as any} size={22} color={iconColor} />
      </View>
      <Text variant="titleLarge" style={{ fontWeight: 'bold', marginTop: 6 }}>{value}</Text>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>{label}</Text>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 48, paddingBottom: 16 },
  levelCard: { marginHorizontal: 16, borderRadius: 16, padding: 16, marginBottom: 12 },
  levelRow: { flexDirection: 'row', alignItems: 'center' },
  levelBadge: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  achievementProgress: { width: 60, height: 6, borderRadius: 3, marginRight: 8 },
  achievementFill: { height: 6, borderRadius: 3 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16, marginBottom: 24 },
  statItem: { width: '30%', flexGrow: 1, borderRadius: 12, padding: 14, alignItems: 'center', gap: 2 },
  statIconBg: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  section: { paddingHorizontal: 16, marginBottom: 24 },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  sessionDot: { width: 10, height: 10, borderRadius: 5 },
  empty: { alignItems: 'center', paddingTop: 60 },
});
