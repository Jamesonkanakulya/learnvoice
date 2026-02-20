import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, Animated } from 'react-native';
import { Text, Surface, useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { Achievement } from '../types';
import { getAchievements } from '../services/achievements/achievementService';

export default function AchievementsScreen() {
  const theme = useTheme();
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useFocusEffect(
    useCallback(() => {
      setAchievements(getAchievements());
    }, [])
  );

  const unlocked = achievements.filter((a) => a.unlockedAt);
  const locked = achievements.filter((a) => !a.unlockedAt);
  const totalXP = unlocked.reduce((sum, a) => sum + a.xpReward, 0);

  const renderAchievement = ({ item }: { item: Achievement }) => {
    const isUnlocked = item.unlockedAt !== null;
    const date = item.unlockedAt ? new Date(item.unlockedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : null;

    return (
      <Surface
        style={[
          styles.card,
          {
            backgroundColor: isUnlocked ? theme.colors.surface : theme.colors.surfaceVariant,
            opacity: isUnlocked ? 1 : 0.6,
          },
        ]}
        elevation={isUnlocked ? 2 : 0}
      >
        <View style={[styles.iconContainer, {
          backgroundColor: isUnlocked ? theme.colors.primary + '20' : theme.colors.onSurfaceVariant + '15',
        }]}>
          <MaterialIcons
            name={item.icon as any}
            size={28}
            color={isUnlocked ? theme.colors.primary : theme.colors.onSurfaceVariant}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>{item.name}</Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
            {item.description}
          </Text>
          {date && (
            <Text variant="labelSmall" style={{ color: theme.colors.primary, marginTop: 4 }}>
              Unlocked {date}
            </Text>
          )}
        </View>
        <View style={styles.xpBadge}>
          <Text variant="labelSmall" style={{ color: isUnlocked ? '#FFD700' : theme.colors.onSurfaceVariant, fontWeight: 'bold' }}>
            +{item.xpReward} XP
          </Text>
        </View>
      </Surface>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={{ fontWeight: 'bold', color: theme.colors.onBackground }}>
          Achievements
        </Text>
      </View>

      {/* Summary Card */}
      <Surface style={[styles.summary, { backgroundColor: theme.colors.primaryContainer }]} elevation={0}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <MaterialIcons name="emoji-events" size={28} color="#FFD700" />
            <Text variant="titleLarge" style={{ fontWeight: 'bold', marginTop: 4 }}>
              {unlocked.length}/{achievements.length}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Unlocked</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: theme.colors.outline }]} />
          <View style={styles.summaryItem}>
            <MaterialIcons name="star" size={28} color="#9C27B0" />
            <Text variant="titleLarge" style={{ fontWeight: 'bold', marginTop: 4 }}>
              {totalXP}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>XP Earned</Text>
          </View>
        </View>
        {/* Progress bar */}
        <View style={[styles.progressBg, { backgroundColor: theme.colors.outline + '40' }]}>
          <View style={[styles.progressFill, {
            backgroundColor: theme.colors.primary,
            width: `${(unlocked.length / achievements.length) * 100}%`,
          }]} />
        </View>
      </Surface>

      <FlatList
        data={[...unlocked.sort((a, b) => (b.unlockedAt || 0) - (a.unlockedAt || 0)), ...locked]}
        keyExtractor={(item) => item.id}
        renderItem={renderAchievement}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 48, paddingBottom: 12 },
  summary: { marginHorizontal: 16, borderRadius: 16, padding: 20, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  summaryItem: { alignItems: 'center' },
  summaryDivider: { width: 1, height: 48 },
  progressBg: { height: 6, borderRadius: 3, marginTop: 16 },
  progressFill: { height: 6, borderRadius: 3 },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  iconContainer: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  xpBadge: { paddingHorizontal: 8, paddingVertical: 4 },
});
