import React, { useCallback, useState } from 'react';
import { View, FlatList, StyleSheet, Alert } from 'react-native';
import { Text, Card, FAB, Button, useTheme, IconButton, Menu, Divider } from 'react-native-paper';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { RootStackParamList, Deck, Question } from '../types';
import { getDeck, deleteDeck, getQuestionsByDeck, deleteQuestion } from '../services/data';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function DeckDetailScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'DeckDetail'>>();
  const { deckId } = route.params;

  const [deck, setDeck] = useState<Deck | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [menuVisible, setMenuVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      Promise.all([getDeck(deckId), getQuestionsByDeck(deckId)]).then(([d, q]) => {
        setDeck(d);
        setQuestions(q);
        if (d) navigation.setOptions({ title: d.name });
      });
    }, [deckId, navigation])
  );

  const handleDeleteDeck = () => {
    Alert.alert('Delete Deck', 'Are you sure? This will delete all questions in this deck.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteDeck(deckId);
          navigation.goBack();
        },
      },
    ]);
  };

  const handleDeleteQuestion = (qId: string) => {
    Alert.alert('Delete Question', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteQuestion(qId);
          setQuestions((prev) => prev.filter((q) => q.id !== qId));
        },
      },
    ]);
  };

  const masteryAvg = questions.length > 0
    ? Math.round(questions.reduce((sum, q) => sum + q.masteryLevel, 0) / questions.length)
    : 0;

  const renderQuestion = ({ item, index }: { item: Question; index: number }) => (
    <Card style={[styles.questionCard, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <View style={styles.questionRow}>
          <View style={styles.questionNumber}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>#{index + 1}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodyMedium" style={{ fontWeight: '600' }}>{item.question}</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
              {item.expectedAnswers[0]}
            </Text>
            <View style={styles.questionMeta}>
              <View style={[styles.diffBadge, {
                backgroundColor: item.difficulty === 'easy' ? '#4CAF5020' : item.difficulty === 'hard' ? '#FF444420' : '#FF980020'
              }]}>
                <Text variant="labelSmall" style={{
                  color: item.difficulty === 'easy' ? '#4CAF50' : item.difficulty === 'hard' ? '#FF4444' : '#FF9800'
                }}>
                  {item.difficulty}
                </Text>
              </View>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Mastery: {item.masteryLevel}%
              </Text>
            </View>
          </View>
          <View style={styles.questionActions}>
            <IconButton
              icon="pencil"
              size={18}
              onPress={() => navigation.navigate('EditQuestion', { deckId, questionId: item.id })}
            />
            <IconButton
              icon="delete-outline"
              size={18}
              onPress={() => handleDeleteQuestion(item.id)}
            />
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  if (!deck) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerSection}>
        <View style={[styles.deckIcon, { backgroundColor: deck.color + '20' }]}>
          <MaterialIcons name={deck.icon as any} size={40} color={deck.color} />
        </View>
        <View style={styles.headerInfo}>
          <Text variant="headlineSmall" style={{ fontWeight: 'bold' }}>{deck.name}</Text>
          {deck.description ? (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{deck.description}</Text>
          ) : null}
          <View style={styles.statsRow}>
            <Text variant="bodySmall" style={{ color: theme.colors.primary }}>
              {questions.length} questions
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {masteryAvg}% mastery
            </Text>
          </View>
        </View>
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={<IconButton icon="dots-vertical" onPress={() => setMenuVisible(true)} />}
        >
          <Menu.Item
            onPress={() => { setMenuVisible(false); navigation.navigate('EditDeck', { deckId }); }}
            title="Edit Deck"
            leadingIcon="pencil"
          />
          <Divider />
          <Menu.Item onPress={() => { setMenuVisible(false); handleDeleteDeck(); }} title="Delete Deck" leadingIcon="delete" />
        </Menu>
      </View>

      {questions.length > 0 && (
        <Button
          mode="contained"
          onPress={() => navigation.navigate('StudySession', { deckId })}
          style={styles.studyButton}
          contentStyle={{ height: 48 }}
          icon="school"
        >
          Start Study Session
        </Button>
      )}

      <Divider style={{ marginVertical: 8 }} />

      <View style={styles.sectionHeader}>
        <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>Questions</Text>
      </View>

      {questions.length === 0 ? (
        <View style={styles.empty}>
          <MaterialIcons name="help-outline" size={48} color={theme.colors.onSurfaceVariant} />
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12, textAlign: 'center' }}>
            No questions yet.{'\n'}Add some to start learning!
          </Text>
        </View>
      ) : (
        <FlatList
          data={questions}
          keyExtractor={(item) => item.id}
          renderItem={renderQuestion}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <FAB
        icon="plus"
        label="Add Question"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
        onPress={() => navigation.navigate('AddQuestion', { deckId })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerSection: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  deckIcon: { width: 64, height: 64, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  headerInfo: { flex: 1 },
  statsRow: { flexDirection: 'row', gap: 16, marginTop: 4 },
  studyButton: { marginHorizontal: 16, borderRadius: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  questionCard: { marginBottom: 8, borderRadius: 10 },
  questionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  questionNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#f0f0f5', justifyContent: 'center', alignItems: 'center' },
  questionMeta: { flexDirection: 'row', gap: 12, marginTop: 6, alignItems: 'center' },
  diffBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  questionActions: { flexDirection: 'column' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  fab: { position: 'absolute', right: 16, bottom: 16, borderRadius: 16 },
});
