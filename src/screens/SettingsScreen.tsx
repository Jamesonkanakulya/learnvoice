import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, Pressable, Platform } from 'react-native';
import { Text, Switch, List, Divider, useTheme, Button, Snackbar, Dialog, Portal, RadioButton } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useAppStore } from '../store/useAppStore';
import { speechService, VoiceOption } from '../services/voice/webSpeechService';
import { exportAllDecks, importFromJSON, importFromCSV, downloadFile, triggerFileUpload } from '../services/importExport/importExportService';

const SPEECH_RATES = [
  { label: 'Slow', value: 0.5 },
  { label: 'Normal', value: 1.0 },
  { label: 'Fast', value: 1.5 },
  { label: 'Very Fast', value: 2.0 },
];

export default function SettingsScreen() {
  const theme = useTheme();
  const { isDarkMode, toggleDarkMode, voiceSettings, setVoiceSettings } = useAppStore();
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [showHints, setShowHints] = useState(true);
  const [snackbar, setSnackbar] = useState('');
  const [availableVoices, setAvailableVoices] = useState<VoiceOption[]>([]);
  const [voiceDialogVisible, setVoiceDialogVisible] = useState(false);

  // Load available voices (they load asynchronously in browsers)
  useEffect(() => {
    const loadVoices = () => {
      const voices = speechService.getAvailableVoices();
      if (voices.length > 0) setAvailableVoices(voices);
    };
    loadVoices();
    // Voices may load async on some browsers
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const handleExport = async () => {
    try {
      const json = await exportAllDecks();
      const filename = `learnvoice-export-${new Date().toISOString().split('T')[0]}.json`;
      downloadFile(json, filename);
      setSnackbar('Decks exported successfully!');
    } catch (err: any) {
      Alert.alert('Export Failed', err.message);
    }
  };

  const handleImport = async () => {
    try {
      const content = await triggerFileUpload();
      const trimmed = content.trim();
      if (trimmed.startsWith('{')) {
        const result = await importFromJSON(content);
        setSnackbar(`Imported ${result.decksImported} deck(s) with ${result.questionsImported} question(s)!`);
      } else {
        const deckName = prompt('Enter a name for the imported deck:') || 'Imported Deck';
        const result = await importFromCSV(content, deckName);
        setSnackbar(`Imported ${result.questionsImported} question(s)!`);
      }
    } catch (err: any) {
      if (err.message !== 'No file selected') {
        Alert.alert('Import Failed', err.message);
      }
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all decks, questions, and study progress. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              if (Platform.OS === 'web') {
                localStorage.removeItem('learnvoice_data');
                localStorage.removeItem('learnvoice_achievements');
                localStorage.removeItem('learnvoice_onboarded');
              } else {
                await SecureStore.deleteItemAsync('learnvoice_onboarded');
                // SQLite data cleared on next init cycle
              }
              Alert.alert('Data Cleared', 'All data has been cleared. Please reload the app.');
            } catch {
              Alert.alert('Error', 'Failed to clear data.');
            }
          },
        },
      ]
    );
  };

  const handleTestVoice = async () => {
    if (!speechService.isTTSAvailable || !voiceSettings.ttsEnabled) {
      setSnackbar('Text-to-speech is disabled or not available.');
      return;
    }
    await speechService.speak('Hello! I am LearnVoice, your learning companion. Voice is working great!', {
      rate: voiceSettings.speechRate,
      voiceName: voiceSettings.selectedVoiceName,
    });
    setSnackbar('Voice test complete!');
  };

  const selectedVoiceLabel = voiceSettings.selectedVoiceName
    ? voiceSettings.selectedVoiceName
    : 'Auto (Best English Voice)';

  const englishVoices = availableVoices.filter((v) => v.lang.startsWith('en'));
  const otherVoices = availableVoices.filter((v) => !v.lang.startsWith('en'));

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={{ fontWeight: 'bold', color: theme.colors.onBackground }}>
          Settings
        </Text>
      </View>

      {/* ──── Appearance ──── */}
      <List.Section>
        <List.Subheader>Appearance</List.Subheader>
        <List.Item
          title="Dark Mode"
          description="Switch between light and dark themes"
          left={(props) => <List.Icon {...props} icon="brightness-6" />}
          right={() => <Switch value={isDarkMode} onValueChange={toggleDarkMode} />}
        />
      </List.Section>

      <Divider />

      {/* ──── Study Preferences ──── */}
      <List.Section>
        <List.Subheader>Study Preferences</List.Subheader>
        <List.Item
          title="Shuffle Questions"
          description="Randomize question order in sessions"
          left={(props) => <List.Icon {...props} icon="shuffle" />}
          right={() => <Switch value={shuffleQuestions} onValueChange={setShuffleQuestions} />}
        />
        <List.Item
          title="Auto-advance"
          description="Automatically move to next question after feedback"
          left={(props) => <List.Icon {...props} icon="skip-next" />}
          right={() => <Switch value={autoAdvance} onValueChange={setAutoAdvance} />}
        />
        <List.Item
          title="Show Hints"
          description="Display hint button during study sessions"
          left={(props) => <List.Icon {...props} icon="lightbulb-outline" />}
          right={() => <Switch value={showHints} onValueChange={setShowHints} />}
        />
      </List.Section>

      <Divider />

      {/* ──── Voice & Audio ──── */}
      <List.Section>
        <List.Subheader>Voice & Audio</List.Subheader>

        {/* TTS Enable */}
        <List.Item
          title="Text-to-Speech"
          description={
            speechService.isTTSAvailable
              ? 'Read questions and feedback aloud'
              : 'Not available in this browser'
          }
          left={(props) => <List.Icon {...props} icon="volume-up" />}
          right={() => (
            <Switch
              value={voiceSettings.ttsEnabled && speechService.isTTSAvailable}
              onValueChange={(v) => setVoiceSettings({ ttsEnabled: v })}
              disabled={!speechService.isTTSAvailable}
            />
          )}
        />

        {/* STT Enable */}
        <List.Item
          title="Speech Recognition"
          description={
            speechService.isSTTAvailable
              ? 'Speak your answers instead of typing'
              : 'Not available in this browser'
          }
          left={(props) => <List.Icon {...props} icon="mic" />}
          right={() => (
            <Switch
              value={voiceSettings.sttEnabled && speechService.isSTTAvailable}
              onValueChange={(v) => setVoiceSettings({ sttEnabled: v })}
              disabled={!speechService.isSTTAvailable}
            />
          )}
        />

        {/* Auto-read questions */}
        {speechService.isTTSAvailable && voiceSettings.ttsEnabled && (
          <List.Item
            title="Auto-Read Questions"
            description="Automatically read each question aloud when it appears"
            left={(props) => <List.Icon {...props} icon="play-circle-outline" />}
            right={() => (
              <Switch
                value={voiceSettings.autoReadQuestions}
                onValueChange={(v) => setVoiceSettings({ autoReadQuestions: v })}
              />
            )}
          />
        )}

        {/* Auto-listen */}
        {speechService.isSTTAvailable && voiceSettings.sttEnabled && voiceSettings.ttsEnabled && (
          <List.Item
            title="Auto-Listen After Reading"
            description="Start listening for your answer after question is read"
            left={(props) => <List.Icon {...props} icon="mic-none" />}
            right={() => (
              <Switch
                value={voiceSettings.autoListen}
                onValueChange={(v) => setVoiceSettings({ autoListen: v })}
                disabled={!voiceSettings.autoReadQuestions}
              />
            )}
          />
        )}
      </List.Section>

      {/* ──── Speech Rate ──── */}
      {speechService.isTTSAvailable && voiceSettings.ttsEnabled && (
        <>
          <Divider style={{ marginLeft: 16 }} />
          <View style={styles.sectionBlock}>
            <Text variant="labelLarge" style={[styles.blockLabel, { color: theme.colors.onSurfaceVariant }]}>
              Speech Rate
            </Text>
            <View style={styles.rateRow}>
              {SPEECH_RATES.map((r) => {
                const active = voiceSettings.speechRate === r.value;
                return (
                  <Pressable
                    key={r.value}
                    onPress={() => setVoiceSettings({ speechRate: r.value })}
                    style={[
                      styles.rateChip,
                      {
                        backgroundColor: active ? theme.colors.primary : theme.colors.surfaceVariant,
                        borderColor: active ? theme.colors.primary : theme.colors.outline,
                      },
                    ]}
                  >
                    <Text
                      variant="labelMedium"
                      style={{ color: active ? theme.colors.onPrimary : theme.colors.onSurfaceVariant, fontWeight: active ? '700' : '500' }}
                    >
                      {r.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </>
      )}

      {/* ──── Voice Selection ──── */}
      {speechService.isTTSAvailable && voiceSettings.ttsEnabled && availableVoices.length > 0 && (
        <>
          <Divider style={{ marginLeft: 16 }} />
          <Pressable onPress={() => setVoiceDialogVisible(true)}>
            <List.Item
              title="Voice"
              description={selectedVoiceLabel}
              left={(props) => <List.Icon {...props} icon="record-voice-over" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
            />
          </Pressable>
        </>
      )}

      {/* ──── Test Voice ──── */}
      {speechService.isTTSAvailable && (
        <>
          <Divider style={{ marginLeft: 16 }} />
          <View style={styles.sectionBlock}>
            <Button
              mode="outlined"
              onPress={handleTestVoice}
              icon="play-circle-outline"
              disabled={!voiceSettings.ttsEnabled}
              style={{ borderRadius: 10 }}
            >
              Test Voice
            </Button>
          </View>
        </>
      )}

      <Divider />

      {/* ──── Data Management ──── */}
      <List.Section>
        <List.Subheader>Data Management</List.Subheader>
        <List.Item
          title="Export All Decks"
          description="Download your decks as a JSON file"
          left={(props) => <List.Icon {...props} icon="file-download" />}
          onPress={handleExport}
        />
        <List.Item
          title="Import Decks"
          description="Import from JSON or CSV files"
          left={(props) => <List.Icon {...props} icon="file-upload" />}
          onPress={handleImport}
        />
      </List.Section>

      <Divider />

      {/* ──── Danger Zone ──── */}
      <List.Section>
        <List.Subheader>Danger Zone</List.Subheader>
        <List.Item
          title="Clear All Data"
          description="Delete all decks, questions, and progress"
          left={(props) => <List.Icon {...props} icon="delete-forever" color="#FF4444" />}
          titleStyle={{ color: '#FF4444' }}
          onPress={handleClearData}
        />
      </List.Section>

      <View style={styles.footer}>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
          LearnVoice v2.0.0
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 4 }}>
          All data stored locally on your device
        </Text>
      </View>

      <View style={{ height: 32 }} />

      {/* ──── Voice Picker Dialog ──── */}
      <Portal>
        <Dialog visible={voiceDialogVisible} onDismiss={() => setVoiceDialogVisible(false)} style={{ maxHeight: '80%' }}>
          <Dialog.Title>Select Voice</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 400 }}>
            <ScrollView>
              {/* Auto option */}
              <Pressable
                onPress={() => {
                  setVoiceSettings({ selectedVoiceName: '' });
                  setVoiceDialogVisible(false);
                }}
                style={styles.voiceOption}
              >
                <RadioButton
                  value=""
                  status={voiceSettings.selectedVoiceName === '' ? 'checked' : 'unchecked'}
                  onPress={() => {
                    setVoiceSettings({ selectedVoiceName: '' });
                    setVoiceDialogVisible(false);
                  }}
                  color={theme.colors.primary}
                />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium" style={{ fontWeight: '600' }}>Auto</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Best available English voice</Text>
                </View>
              </Pressable>

              {englishVoices.length > 0 && (
                <Text variant="labelSmall" style={[styles.voiceGroupLabel, { color: theme.colors.onSurfaceVariant }]}>
                  ENGLISH VOICES
                </Text>
              )}
              {englishVoices.map((v) => (
                <Pressable
                  key={v.name}
                  onPress={() => {
                    setVoiceSettings({ selectedVoiceName: v.name });
                    setVoiceDialogVisible(false);
                  }}
                  style={styles.voiceOption}
                >
                  <RadioButton
                    value={v.name}
                    status={voiceSettings.selectedVoiceName === v.name ? 'checked' : 'unchecked'}
                    onPress={() => {
                      setVoiceSettings({ selectedVoiceName: v.name });
                      setVoiceDialogVisible(false);
                    }}
                    color={theme.colors.primary}
                  />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium">{v.name}</Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {v.lang}{v.localService ? ' · Local' : ' · Online'}
                    </Text>
                  </View>
                </Pressable>
              ))}

              {otherVoices.length > 0 && (
                <Text variant="labelSmall" style={[styles.voiceGroupLabel, { color: theme.colors.onSurfaceVariant }]}>
                  OTHER LANGUAGES
                </Text>
              )}
              {otherVoices.map((v) => (
                <Pressable
                  key={v.name}
                  onPress={() => {
                    setVoiceSettings({ selectedVoiceName: v.name });
                    setVoiceDialogVisible(false);
                  }}
                  style={styles.voiceOption}
                >
                  <RadioButton
                    value={v.name}
                    status={voiceSettings.selectedVoiceName === v.name ? 'checked' : 'unchecked'}
                    onPress={() => {
                      setVoiceSettings({ selectedVoiceName: v.name });
                      setVoiceDialogVisible(false);
                    }}
                    color={theme.colors.primary}
                  />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium">{v.name}</Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {v.lang}{v.localService ? ' · Local' : ' · Online'}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setVoiceDialogVisible(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={!!snackbar}
        onDismiss={() => setSnackbar('')}
        duration={3000}
        action={{ label: 'OK', onPress: () => setSnackbar('') }}
      >
        {snackbar}
      </Snackbar>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 48, paddingBottom: 16 },
  footer: { padding: 24 },
  sectionBlock: { paddingHorizontal: 16, paddingVertical: 14 },
  blockLabel: { marginBottom: 10, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  rateRow: { flexDirection: 'row', gap: 10 },
  rateChip: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  voiceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingRight: 8,
  },
  voiceGroupLabel: {
    paddingHorizontal: 4,
    paddingTop: 12,
    paddingBottom: 4,
    letterSpacing: 1,
  },
});
