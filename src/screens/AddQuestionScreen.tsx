import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, TextInput, Button, useTheme, SegmentedButtons, Chip } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { createQuestion } from '../services/data';

export default function AddQuestionScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'AddQuestion'>>();
  const { deckId } = route.params;

  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [altAnswers, setAltAnswers] = useState('');
  const [keywords, setKeywords] = useState('');
  const [difficulty, setDifficulty] = useState<string>('medium');
  const [hint, setHint] = useState('');
  const [explanation, setExplanation] = useState('');
  const [saving, setSaving] = useState(false);
  const [addMore, setAddMore] = useState(false);

  const handleSave = async () => {
    if (!question.trim() || !answer.trim()) return;
    setSaving(true);
    try {
      const expectedAnswers = [answer.trim()];
      if (altAnswers.trim()) {
        altAnswers.split('\n').forEach((a) => {
          if (a.trim()) expectedAnswers.push(a.trim());
        });
      }

      const keywordList = keywords.trim()
        ? keywords.split(',').map((k) => k.trim()).filter(Boolean)
        : undefined;

      await createQuestion({
        deckId,
        question: question.trim(),
        expectedAnswers,
        keywords: keywordList,
        difficulty: difficulty as 'easy' | 'medium' | 'hard',
        hints: hint.trim() ? [hint.trim()] : [],
        explanation: explanation.trim(),
      });

      if (addMore) {
        setQuestion('');
        setAnswer('');
        setAltAnswers('');
        setKeywords('');
        setHint('');
        setExplanation('');
      } else {
        navigation.goBack();
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save question. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.form}>
        <TextInput
          label="Question *"
          value={question}
          onChangeText={setQuestion}
          mode="outlined"
          style={styles.input}
          multiline
          placeholder="e.g., What is the powerhouse of the cell?"
        />

        <TextInput
          label="Expected Answer *"
          value={answer}
          onChangeText={setAnswer}
          mode="outlined"
          style={styles.input}
          multiline
          placeholder="e.g., The mitochondria"
        />

        <TextInput
          label="Alternative Answers (one per line)"
          value={altAnswers}
          onChangeText={setAltAnswers}
          mode="outlined"
          style={styles.input}
          multiline
          placeholder="e.g., Mitochondria is the powerhouse of the cell"
        />

        <TextInput
          label="Keywords (comma separated)"
          value={keywords}
          onChangeText={setKeywords}
          mode="outlined"
          style={styles.input}
          placeholder="Auto-extracted if left empty"
        />

        <Text variant="titleSmall" style={{ marginBottom: 8, color: theme.colors.onBackground }}>
          Difficulty
        </Text>
        <SegmentedButtons
          value={difficulty}
          onValueChange={setDifficulty}
          buttons={[
            { value: 'easy', label: 'Easy' },
            { value: 'medium', label: 'Medium' },
            { value: 'hard', label: 'Hard' },
          ]}
          style={styles.input}
        />

        <TextInput
          label="Hint (optional)"
          value={hint}
          onChangeText={setHint}
          mode="outlined"
          style={styles.input}
          placeholder="A clue to help the learner"
        />

        <TextInput
          label="Explanation (optional)"
          value={explanation}
          onChangeText={setExplanation}
          mode="outlined"
          style={styles.input}
          multiline
          placeholder="Detailed explanation shown after answering"
        />

        <View style={styles.addMoreRow}>
          <Chip
            selected={addMore}
            onPress={() => setAddMore(!addMore)}
            showSelectedCheck
          >
            Add another after saving
          </Chip>
        </View>

        <Button
          mode="contained"
          onPress={handleSave}
          disabled={!question.trim() || !answer.trim() || saving}
          loading={saving}
          style={styles.button}
          contentStyle={{ height: 48 }}
        >
          {addMore ? 'Save & Add Another' : 'Save Question'}
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  form: { padding: 16 },
  input: { marginBottom: 16 },
  addMoreRow: { flexDirection: 'row', marginBottom: 16 },
  button: { borderRadius: 12 },
});
