import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, useTheme, SegmentedButtons } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { getQuestion, updateQuestion } from '../services/data';

export default function EditQuestionScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'EditQuestion'>>();
  const { questionId } = route.params;

  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [altAnswers, setAltAnswers] = useState('');
  const [keywords, setKeywords] = useState('');
  const [difficulty, setDifficulty] = useState<string>('medium');
  const [hint, setHint] = useState('');
  const [explanation, setExplanation] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getQuestion(questionId).then((q) => {
      if (q) {
        setQuestion(q.question);
        setAnswer(q.expectedAnswers[0] || '');
        setAltAnswers(q.expectedAnswers.slice(1).join('\n'));
        setKeywords(q.keywords.join(', '));
        setDifficulty(q.difficulty);
        setHint(q.hints[0] || '');
        setExplanation(q.explanation);
        setLoaded(true);
      }
    });
  }, [questionId]);

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

      await updateQuestion(questionId, {
        question: question.trim(),
        expectedAnswers,
        keywords: keywordList,
        difficulty: difficulty as 'easy' | 'medium' | 'hard',
        hints: hint.trim() ? [hint.trim()] : [],
        explanation: explanation.trim(),
      });
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return null;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.form}>
        <TextInput label="Question *" value={question} onChangeText={setQuestion} mode="outlined" style={styles.input} multiline />
        <TextInput label="Expected Answer *" value={answer} onChangeText={setAnswer} mode="outlined" style={styles.input} multiline />
        <TextInput label="Alternative Answers (one per line)" value={altAnswers} onChangeText={setAltAnswers} mode="outlined" style={styles.input} multiline />
        <TextInput label="Keywords (comma separated)" value={keywords} onChangeText={setKeywords} mode="outlined" style={styles.input} />
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
        <TextInput label="Hint (optional)" value={hint} onChangeText={setHint} mode="outlined" style={styles.input} />
        <TextInput label="Explanation (optional)" value={explanation} onChangeText={setExplanation} mode="outlined" style={styles.input} multiline />
        <Button mode="contained" onPress={handleSave} disabled={!question.trim() || !answer.trim() || saving} loading={saving} style={styles.button} contentStyle={{ height: 48 }}>
          Save Changes
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  form: { padding: 16 },
  input: { marginBottom: 16 },
  button: { borderRadius: 12 },
});
