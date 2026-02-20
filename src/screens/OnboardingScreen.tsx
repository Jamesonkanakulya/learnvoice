import React, { useState, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, FlatList } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingSlide {
  icon: string;
  title: string;
  description: string;
  color: string;
}

const SLIDES: OnboardingSlide[] = [
  {
    icon: 'school',
    title: 'Learn Smarter',
    description: 'Create flashcard decks for any subject. Add questions with expected answers and let smart evaluation grade your responses.',
    color: '#6C63FF',
  },
  {
    icon: 'mic',
    title: 'Voice Powered',
    description: 'Answer questions by speaking! Voice recognition captures your answer and compares it against expected responses.',
    color: '#03DAC6',
  },
  {
    icon: 'trending-up',
    title: 'Spaced Repetition',
    description: 'Our SM-2 algorithm schedules reviews at optimal intervals. Questions you struggle with appear more often.',
    color: '#FF9800',
  },
  {
    icon: 'emoji-events',
    title: 'Stay Motivated',
    description: 'Earn XP, level up, maintain streaks, and unlock achievements. Track your progress with detailed statistics.',
    color: '#4CAF50',
  },
];

interface Props {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: Props) {
  const theme = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
      setCurrentIndex(currentIndex + 1);
    } else {
      onComplete();
    }
  };

  const renderSlide = ({ item, index }: { item: OnboardingSlide; index: number }) => (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <View style={[styles.iconContainer, { backgroundColor: item.color + '15' }]}>
        <MaterialIcons name={item.icon as any} size={80} color={item.color} />
      </View>
      <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
        {item.title}
      </Text>
      <Text variant="bodyLarge" style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
        {item.description}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.skipContainer}>
        {currentIndex < SLIDES.length - 1 && (
          <Button onPress={onComplete} textColor={theme.colors.onSurfaceVariant}>
            Skip
          </Button>
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(_, i) => i.toString()}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setCurrentIndex(index);
        }}
        scrollEventThrottle={16}
      />

      {/* Pagination Dots */}
      <View style={styles.pagination}>
        {SLIDES.map((slide, i) => {
          const inputRange = [(i - 1) * SCREEN_WIDTH, i * SCREEN_WIDTH, (i + 1) * SCREEN_WIDTH];
          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 24, 8],
            extrapolate: 'clamp',
          });
          const dotOpacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });
          return (
            <Animated.View
              key={i}
              style={[styles.dot, {
                width: dotWidth,
                opacity: dotOpacity,
                backgroundColor: slide.color,
              }]}
            />
          );
        })}
      </View>

      <View style={styles.bottomSection}>
        <Button
          mode="contained"
          onPress={handleNext}
          style={styles.button}
          contentStyle={{ height: 52 }}
          labelStyle={{ fontSize: 16, fontWeight: 'bold' }}
        >
          {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  skipContainer: { alignItems: 'flex-end', paddingTop: 48, paddingRight: 8, height: 80 },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  title: { fontWeight: 'bold', textAlign: 'center', marginBottom: 16 },
  description: { textAlign: 'center', lineHeight: 24 },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 32 },
  dot: { height: 8, borderRadius: 4 },
  bottomSection: { paddingHorizontal: 24, paddingBottom: 40 },
  button: { borderRadius: 14 },
});
