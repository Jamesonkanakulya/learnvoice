import React, { useEffect, useRef } from 'react';
import { View, ScrollView, StyleSheet, Animated } from 'react-native';
import { Text, Button, useTheme, Surface, Divider } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function SessionResultsScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'SessionResults'>>();
  const { result } = route.params;

  const scoreAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 6, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.timing(scoreAnim, { toValue: result.averageScore, duration: 800, useNativeDriver: false }),
    ]).start();
  }, []);

  const duration = Math.round((result.completedAt - result.startedAt) / 60000);
  const scoreColor = result.averageScore >= 80 ? '#4CAF50' : result.averageScore >= 50 ? '#FF9800' : '#FF4444';

  const getCategoryInfo = () => {
    if (result.averageScore >= 90) return { label: 'Outstanding!', icon: 'emoji-events', color: '#FFD700' };
    if (result.averageScore >= 70) return { label: 'Great Job!', icon: 'thumb-up', color: '#4CAF50' };
    if (result.averageScore >= 50) return { label: 'Keep Practicing!', icon: 'trending-up', color: '#FF9800' };
    return { label: 'Keep Going!', icon: 'fitness-center', color: '#FF4444' };
  };

  const info = getCategoryInfo();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} showsVerticalScrollIndicator={false}>
      {/* Score Hero */}
      <Animated.View style={[styles.scoreSection, {
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }],
      }]}>
        <View style={[styles.scoreRing, { borderColor: scoreColor }]}>
          <View style={[styles.scoreInner, { backgroundColor: theme.colors.surface }]}>
            <Text variant="displayMedium" style={{ fontWeight: 'bold', color: scoreColor }}>
              {result.averageScore}%
            </Text>
          </View>
        </View>
        <View style={styles.categoryBadge}>
          <MaterialIcons name={info.icon as any} size={24} color={info.color} />
          <Text variant="titleLarge" style={{ fontWeight: 'bold', marginLeft: 8 }}>
            {info.label}
          </Text>
        </View>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
          {result.deckName}
        </Text>
      </Animated.View>

      {/* Stats Grid */}
      <Animated.View style={[styles.statsGrid, { opacity: fadeAnim }]}>
        <Surface style={[styles.statCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
          <View style={[styles.statIconBg, { backgroundColor: '#4CAF5015' }]}>
            <MaterialIcons name="check-circle" size={22} color="#4CAF50" />
          </View>
          <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>{result.answeredQuestions}</Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Answered</Text>
        </Surface>
        <Surface style={[styles.statCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
          <View style={[styles.statIconBg, { backgroundColor: '#FFD70015' }]}>
            <MaterialIcons name="star" size={22} color="#FFD700" />
          </View>
          <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>{result.perfectAnswers}</Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Perfect</Text>
        </Surface>
        <Surface style={[styles.statCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
          <View style={[styles.statIconBg, { backgroundColor: '#9E9E9E15' }]}>
            <MaterialIcons name="skip-next" size={22} color="#9E9E9E" />
          </View>
          <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>{result.skippedQuestions}</Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Skipped</Text>
        </Surface>
        <Surface style={[styles.statCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
          <View style={[styles.statIconBg, { backgroundColor: '#2196F315' }]}>
            <MaterialIcons name="timer" size={22} color="#2196F3" />
          </View>
          <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>{duration}m</Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Duration</Text>
        </Surface>
      </Animated.View>

      {/* Question Breakdown */}
      <Animated.View style={[styles.breakdown, { opacity: fadeAnim }]}>
        <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 12 }}>Question Breakdown</Text>
        {result.results.map((r, i) => (
          <View key={i}>
            <Surface style={[styles.breakdownCard, { backgroundColor: theme.colors.surface }]} elevation={0}>
              <View style={[styles.breakdownIndex, {
                backgroundColor: r.skipped ? '#9E9E9E15' : r.score >= 70 ? '#4CAF5015' : r.score >= 50 ? '#FF980015' : '#FF444415'
              }]}>
                <Text variant="labelSmall" style={{
                  color: r.skipped ? '#9E9E9E' : r.score >= 70 ? '#4CAF50' : r.score >= 50 ? '#FF9800' : '#FF4444',
                  fontWeight: 'bold',
                }}>
                  {i + 1}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" numberOfLines={2}>
                  {r.skipped ? 'Skipped' : r.feedback.message}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }} numberOfLines={1}>
                  {r.expectedAnswer}
                </Text>
              </View>
              <View style={[styles.breakdownScore, {
                backgroundColor: r.skipped ? '#9E9E9E15' : r.score >= 70 ? '#4CAF5015' : '#FF444415'
              }]}>
                <Text variant="titleSmall" style={{
                  fontWeight: 'bold',
                  color: r.skipped ? '#9E9E9E' : r.score >= 70 ? '#4CAF50' : '#FF4444'
                }}>
                  {r.skipped ? '-' : `${r.score}%`}
                </Text>
              </View>
            </Surface>
            {i < result.results.length - 1 && <View style={{ height: 6 }} />}
          </View>
        ))}
      </Animated.View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('StudySession', { deckId: result.deckId })}
          style={styles.actionButton}
          contentStyle={{ height: 48 }}
          icon="refresh"
        >
          Study Again
        </Button>
        <Button
          mode="outlined"
          onPress={() => navigation.navigate('MainTabs')}
          style={styles.actionButton}
          contentStyle={{ height: 48 }}
        >
          Back to Home
        </Button>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scoreSection: { alignItems: 'center', paddingTop: 24, paddingBottom: 24 },
  scoreRing: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreInner: {
    width: 130,
    height: 130,
    borderRadius: 65,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16, marginBottom: 24 },
  statCard: { flex: 1, minWidth: '40%', borderRadius: 14, padding: 14, alignItems: 'center', gap: 4 },
  statIconBg: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  breakdown: { paddingHorizontal: 16, marginBottom: 24 },
  breakdownCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  breakdownIndex: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breakdownScore: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  actions: { paddingHorizontal: 16, gap: 12 },
  actionButton: { borderRadius: 12 },
});
