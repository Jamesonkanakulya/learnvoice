import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { Text, Button, TextInput, useTheme, IconButton, ProgressBar, Surface } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { RootStackParamList, Question, EvaluationResult, SessionResult } from '../types';
import { getDeck, getQuestionsByDeck, updateQuestionAfterReview, updateStatsAfterSession, saveSessionResult } from '../services/data';
import { evaluateAnswer, calculateNextReview } from '../services/ai/evaluationService';
import { useAppStore } from '../store/useAppStore';
import { speechService } from '../services/voice/webSpeechService';
import { checkAchievements } from '../services/achievements/achievementService';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Phase = 'question' | 'answering' | 'feedback';

export default function StudySessionScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'StudySession'>>();
  const { deckId } = route.params;

  const setUserStats = useAppStore((s) => s.setUserStats);
  const voiceSettings = useAppStore((s) => s.voiceSettings);

  const ttsOn = voiceSettings.ttsEnabled && speechService.isTTSAvailable;
  const sttOn = voiceSettings.sttEnabled && speechService.isSTTAvailable;

  const [deckName, setDeckName] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('question');
  const [userAnswer, setUserAnswer] = useState('');
  const [currentEval, setCurrentEval] = useState<EvaluationResult | null>(null);
  const [results, setResults] = useState<EvaluationResult[]>([]);
  const [startTime] = useState(Date.now());
  const [showHint, setShowHint] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);

  // Voice mode state
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [partialText, setPartialText] = useState('');

  // Animations
  const cardScale = useRef(new Animated.Value(1)).current;
  const feedbackSlide = useRef(new Animated.Value(50)).current;
  const feedbackOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Promise.all([getDeck(deckId), getQuestionsByDeck(deckId)]).then(([d, q]) => {
      if (d) setDeckName(d.name);
      const shuffled = [...q].sort(() => Math.random() - 0.5);
      setQuestions(shuffled);
    });
  }, [deckId]);

  const currentQuestion = questions[currentIndex];
  const isComplete = currentIndex >= questions.length;
  const progress = questions.length > 0 ? currentIndex / questions.length : 0;

  // Speak the question in voice mode (or when auto-read is enabled)
  useEffect(() => {
    if (!currentQuestion || phase !== 'question') return;

    const shouldSpeak = isVoiceMode
      ? ttsOn
      : ttsOn && voiceSettings.autoReadQuestions;

    if (!shouldSpeak) return;

    setIsSpeaking(true);
    speechService
      .speak(currentQuestion.question, {
        rate: voiceSettings.speechRate,
        voiceName: voiceSettings.selectedVoiceName,
      })
      .then(() => {
        setIsSpeaking(false);
        // Auto-listen after reading (only in voice mode with the setting enabled)
        if (isVoiceMode && sttOn && voiceSettings.autoListen) {
          handleStartListening();
        }
      });
  }, [isVoiceMode, currentIndex, phase, questions.length]);

  const handleStartListening = async () => {
    if (!sttOn) return;
    setIsListening(true);
    setPartialText('');
    try {
      const result = await speechService.startListening((partial) => {
        setPartialText(partial);
      });
      setUserAnswer(result.text);
      setPartialText('');
      setIsListening(false);
      if (result.text) {
        setPhase('answering');
      }
    } catch {
      setIsListening(false);
    }
  };

  const handleStopListening = () => {
    speechService.stopListening();
    setIsListening(false);
  };

  const animateCardBounce = () => {
    Animated.sequence([
      Animated.timing(cardScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.spring(cardScale, { toValue: 1, tension: 80, friction: 6, useNativeDriver: true }),
    ]).start();
  };

  const animateFeedback = () => {
    feedbackSlide.setValue(50);
    feedbackOpacity.setValue(0);
    Animated.parallel([
      Animated.timing(feedbackSlide, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(feedbackOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const handleSubmit = useCallback(async () => {
    if (!userAnswer.trim() || !currentQuestion) return;

    const evaluation = evaluateAnswer(userAnswer, currentQuestion);
    setCurrentEval(evaluation);
    setResults((prev) => [...prev, evaluation]);

    const sr = calculateNextReview(
      evaluation.score,
      currentQuestion.easeFactor,
      currentQuestion.interval,
      currentQuestion.repetitions
    );
    await updateQuestionAfterReview(
      currentQuestion.id,
      evaluation.score,
      sr.easeFactor,
      sr.interval,
      sr.repetitions,
      sr.nextReviewDate
    );

    setPhase('feedback');
    animateFeedback();

    // Speak feedback in voice mode or if TTS auto-read is on
    if (ttsOn && (isVoiceMode || voiceSettings.autoReadQuestions)) {
      const msg = `${evaluation.score} percent. ${evaluation.feedback.message}`;
      speechService.speak(msg, {
        rate: voiceSettings.speechRate,
        voiceName: voiceSettings.selectedVoiceName,
      });
    }
  }, [userAnswer, currentQuestion, isVoiceMode, ttsOn, voiceSettings]);

  const handleNext = () => {
    setUserAnswer('');
    setCurrentEval(null);
    setShowHint(false);
    setHintIndex(0);
    setCurrentIndex((prev) => prev + 1);
    setPhase('question');
    animateCardBounce();
  };

  const handleRetry = () => {
    setUserAnswer('');
    setCurrentEval(null);
    setResults((prev) => prev.slice(0, -1));
    setPhase('answering');
  };

  const handleSkip = () => {
    const skipResult: EvaluationResult = {
      score: 0,
      keywordScore: 0,
      keywordDetails: [],
      feedback: { message: 'Skipped', details: '', category: 'incorrect' },
      userAnswer: '',
      expectedAnswer: currentQuestion?.expectedAnswers[0] || '',
      skipped: true,
    };
    setResults((prev) => [...prev, skipResult]);
    handleNext();
  };

  const handleShowHint = () => {
    if (!showHint) {
      setShowHint(true);
      setHintIndex(0);
    } else if (hintIndex < (currentQuestion?.hints.length || 0) - 1) {
      setHintIndex((prev) => prev + 1);
    }
  };

  const handleEndSession = async () => {
    speechService.stopSpeaking();
    const answered = results.filter((r) => !r.skipped);
    const totalScore = answered.reduce((sum, r) => sum + r.score, 0);

    const sessionResult: SessionResult = {
      deckId,
      deckName,
      startedAt: startTime,
      completedAt: Date.now(),
      totalQuestions: questions.length,
      answeredQuestions: answered.length,
      skippedQuestions: results.filter((r) => r.skipped).length,
      averageScore: answered.length > 0 ? Math.round(totalScore / answered.length) : 0,
      perfectAnswers: answered.filter((r) => r.score === 100).length,
      results,
    };

    try {
      await saveSessionResult(sessionResult);
    } catch (e) {
      console.warn('Failed to save session result:', e);
    }

    try {
      const newStats = await updateStatsAfterSession(sessionResult);
      setUserStats(newStats);
      checkAchievements(newStats, sessionResult);
    } catch (e) {
      console.warn('Failed to update stats:', e);
    }

    // Always navigate — even if saving/stats failed, show the results
    navigation.replace('SessionResults', { result: sessionResult });
  };

  useEffect(() => {
    if (isComplete && questions.length > 0) {
      handleEndSession();
    }
  }, [isComplete, questions.length]);

  if (questions.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <MaterialIcons name="hourglass-empty" size={48} color={theme.colors.onSurfaceVariant} />
        <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, marginTop: 16 }}>Loading questions...</Text>
      </View>
    );
  }

  if (isComplete) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <MaterialIcons name="check-circle" size={48} color={theme.colors.primary} />
        <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, marginTop: 16 }}>Saving results...</Text>
      </View>
    );
  }

  const scoreColor = (score: number) => {
    if (score >= 90) return '#4CAF50';
    if (score >= 70) return '#FF9800';
    if (score >= 50) return '#FF9800';
    return '#FF4444';
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <IconButton icon="close" onPress={() => {
          speechService.stopSpeaking();
          if (results.length > 0) handleEndSession();
          else navigation.goBack();
        }} />
        <Text variant="titleMedium" style={{ flex: 1, textAlign: 'center', fontWeight: 'bold' }}>
          {deckName}
        </Text>
        <View style={styles.headerRight}>
          {/* Voice Mode Toggle — show if either TTS or STT is enabled */}
          {(ttsOn || sttOn) && (
            <IconButton
              icon={isVoiceMode ? 'microphone' : 'microphone-off'}
              iconColor={isVoiceMode ? theme.colors.primary : theme.colors.onSurfaceVariant}
              size={20}
              onPress={() => {
                setIsVoiceMode(!isVoiceMode);
                speechService.stopSpeaking();
                speechService.stopListening();
                setIsListening(false);
              }}
            />
          )}
          {/* Auto-read indicator */}
          {!isVoiceMode && ttsOn && voiceSettings.autoReadQuestions && (
            <View style={[styles.autoReadBadge, { backgroundColor: theme.colors.primary + '20' }]}>
              <MaterialIcons name="volume-up" size={14} color={theme.colors.primary} />
            </View>
          )}
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {currentIndex + 1}/{questions.length}
          </Text>
        </View>
      </View>

      <ProgressBar progress={progress} color={theme.colors.primary} style={styles.progressBar} />

      {/* Question */}
      <View style={styles.content}>
        <Animated.View style={{ transform: [{ scale: cardScale }] }}>
          <Surface style={[styles.questionCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <View style={styles.questionHeader}>
              <MaterialIcons name="help-outline" size={28} color={theme.colors.primary} />
              {isSpeaking && (
                <View style={styles.speakingIndicator}>
                  <MaterialIcons name="volume-up" size={16} color={theme.colors.primary} />
                  <Text variant="labelSmall" style={{ color: theme.colors.primary }}>Speaking...</Text>
                </View>
              )}
            </View>
            <Text variant="titleLarge" style={{ textAlign: 'center', marginTop: 12, lineHeight: 28 }}>
              {currentQuestion.question}
            </Text>
            {currentQuestion.difficulty !== 'medium' && (
              <View style={[styles.diffBadge, {
                backgroundColor: currentQuestion.difficulty === 'easy' ? '#4CAF5020' : '#FF444420'
              }]}>
                <Text variant="labelSmall" style={{
                  color: currentQuestion.difficulty === 'easy' ? '#4CAF50' : '#FF4444'
                }}>
                  {currentQuestion.difficulty}
                </Text>
              </View>
            )}
          </Surface>
        </Animated.View>

        {/* Hint Section */}
        {showHint && currentQuestion.hints.length > 0 && (
          <Surface style={[styles.hintCard, { backgroundColor: '#FFF3E015' }]} elevation={0}>
            <MaterialIcons name="lightbulb" size={18} color="#FF9800" />
            <Text variant="bodySmall" style={{ flex: 1, color: theme.colors.onSurface }}>
              {currentQuestion.hints[hintIndex]}
            </Text>
          </Surface>
        )}

        {/* Answer Phase */}
        {(phase === 'question' || phase === 'answering') && (
          <View style={styles.answerSection}>
            {isVoiceMode && sttOn ? (
              <View style={styles.voiceSection}>
                {isListening ? (
                  <>
                    <Surface style={[styles.listeningCard, { backgroundColor: theme.colors.primaryContainer }]} elevation={0}>
                      <View style={styles.listeningPulse}>
                        <MaterialIcons name="mic" size={40} color={theme.colors.primary} />
                      </View>
                      <Text variant="bodyMedium" style={{ textAlign: 'center', marginTop: 12 }}>
                        {partialText || 'Listening...'}
                      </Text>
                    </Surface>
                    <Button mode="outlined" onPress={handleStopListening} icon="stop" style={{ marginTop: 12 }}>
                      Stop
                    </Button>
                  </>
                ) : (
                  <>
                    {userAnswer ? (
                      <Surface style={[styles.voiceResult, { backgroundColor: theme.colors.surfaceVariant }]} elevation={0}>
                        <Text variant="bodyMedium" style={{ textAlign: 'center' }}>
                          "{userAnswer}"
                        </Text>
                      </Surface>
                    ) : null}
                    <Button
                      mode="contained"
                      onPress={handleStartListening}
                      icon="microphone"
                      style={{ borderRadius: 12, marginTop: 12 }}
                      contentStyle={{ height: 52 }}
                      labelStyle={{ fontSize: 16 }}
                    >
                      {userAnswer ? 'Record Again' : 'Tap to Speak'}
                    </Button>
                  </>
                )}
                {/* Also allow text input in voice mode */}
                <TextInput
                  label="Or type your answer"
                  value={userAnswer}
                  onChangeText={(text) => {
                    setUserAnswer(text);
                    if (phase === 'question') setPhase('answering');
                  }}
                  mode="outlined"
                  style={[styles.answerInput, { marginTop: 16 }]}
                  multiline
                  dense
                />
              </View>
            ) : (
              <>
                <TextInput
                  label="Your Answer"
                  value={userAnswer}
                  onChangeText={(text) => {
                    setUserAnswer(text);
                    if (phase === 'question') setPhase('answering');
                  }}
                  mode="outlined"
                  style={styles.answerInput}
                  multiline
                  placeholder="Type your answer here..."
                  autoFocus={!sttOn}
                  right={sttOn && !isListening
                    ? <TextInput.Icon icon="microphone" onPress={handleStartListening} />
                    : sttOn && isListening
                    ? <TextInput.Icon icon="stop-circle" onPress={handleStopListening} />
                    : undefined}
                />
                {isListening && (
                  <View style={styles.inlineListening}>
                    <MaterialIcons name="mic" size={16} color={theme.colors.primary} />
                    <Text variant="bodySmall" style={{ color: theme.colors.primary, flex: 1 }}>
                      {partialText || 'Listening — speak your answer...'}
                    </Text>
                    <Button compact mode="outlined" onPress={handleStopListening} icon="stop">Stop</Button>
                  </View>
                )}
              </>
            )}

            <View style={styles.actionRow}>
              {currentQuestion.hints.length > 0 && (
                <Button mode="outlined" onPress={handleShowHint} icon="lightbulb-outline" compact>
                  {showHint && hintIndex < currentQuestion.hints.length - 1 ? 'More Hints' : 'Hint'}
                </Button>
              )}
              <Button mode="outlined" onPress={handleSkip} compact>
                Skip
              </Button>
              <Button
                mode="contained"
                onPress={handleSubmit}
                disabled={!userAnswer.trim()}
                style={{ flex: 1 }}
                contentStyle={{ height: 44 }}
              >
                Submit
              </Button>
            </View>
          </View>
        )}

        {/* Feedback Phase */}
        {phase === 'feedback' && currentEval && (
          <Animated.View style={[styles.feedbackSection, {
            transform: [{ translateY: feedbackSlide }],
            opacity: feedbackOpacity,
          }]}>
            <Surface style={[styles.scoreCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
              <Text variant="displaySmall" style={{ fontWeight: 'bold', color: scoreColor(currentEval.score) }}>
                {currentEval.score}%
              </Text>
              <Text variant="titleMedium" style={{ textAlign: 'center', marginTop: 4 }}>
                {currentEval.feedback.message}
              </Text>
            </Surface>

            {currentEval.feedback.details ? (
              <Surface style={[styles.detailsCard, { backgroundColor: theme.colors.surfaceVariant }]} elevation={0}>
                <Text variant="bodyMedium">{currentEval.feedback.details}</Text>
              </Surface>
            ) : null}

            {/* Keyword breakdown */}
            {currentEval.keywordDetails.length > 0 && (
              <Surface style={[styles.detailsCard, { backgroundColor: theme.colors.surfaceVariant }]} elevation={0}>
                <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
                  Keyword Match:
                </Text>
                <View style={styles.keywordGrid}>
                  {currentEval.keywordDetails.map((kw, i) => (
                    <View key={i} style={[styles.keywordChip, {
                      backgroundColor: kw.found ? '#4CAF5015' : '#FF444415',
                    }]}>
                      <MaterialIcons
                        name={kw.found ? 'check-circle' : 'cancel'}
                        size={14}
                        color={kw.found ? '#4CAF50' : '#FF4444'}
                      />
                      <Text variant="labelSmall" style={{
                        color: kw.found ? '#4CAF50' : '#FF4444',
                        marginLeft: 4,
                      }}>
                        {kw.keyword}
                      </Text>
                    </View>
                  ))}
                </View>
              </Surface>
            )}

            {currentEval.score < 100 && (
              <Surface style={[styles.detailsCard, { backgroundColor: theme.colors.surfaceVariant }]} elevation={0}>
                <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>
                  Expected Answer:
                </Text>
                <Text variant="bodyMedium">{currentEval.expectedAnswer}</Text>
              </Surface>
            )}

            {currentQuestion.explanation ? (
              <Surface style={[styles.detailsCard, { backgroundColor: theme.colors.surfaceVariant }]} elevation={0}>
                <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>
                  Explanation:
                </Text>
                <Text variant="bodyMedium">{currentQuestion.explanation}</Text>
              </Surface>
            ) : null}

            <View style={styles.feedbackActions}>
              <Button mode="outlined" onPress={handleRetry} icon="refresh" style={{ flex: 1 }}>
                Retry
              </Button>
              <Button mode="contained" onPress={handleNext} icon="arrow-right" style={{ flex: 1 }} contentStyle={{ height: 44 }}>
                Next
              </Button>
            </View>
          </Animated.View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 44, paddingRight: 16 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  autoReadBadge: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  progressBar: { height: 4, marginHorizontal: 16 },
  content: { flex: 1, padding: 16 },
  questionCard: { borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 12 },
  questionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  speakingIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  diffBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 12 },
  hintCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FF980030',
  },
  answerSection: { flex: 1 },
  answerInput: { marginBottom: 16 },
  actionRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  voiceSection: { flex: 1 },
  listeningCard: { borderRadius: 16, padding: 32, alignItems: 'center' },
  listeningPulse: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(108, 99, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceResult: { borderRadius: 12, padding: 16 },
  feedbackSection: { flex: 1, gap: 12 },
  scoreCard: { borderRadius: 16, padding: 24, alignItems: 'center' },
  detailsCard: { borderRadius: 12, padding: 16 },
  keywordGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  keywordChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  feedbackActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  inlineListening: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 4, marginBottom: 8 },
});
