import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import { Text, TextInput, Button, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { createDeck } from '../services/data';
import { DECK_COLORS, DECK_ICONS } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function CreateDeckScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(DECK_COLORS[0]);
  const [icon, setIcon] = useState(DECK_ICONS[0]);
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const deck = await createDeck({ name: name.trim(), description: description.trim(), color, icon });
      navigation.replace('DeckDetail', { deckId: deck.id });
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to create deck. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.preview}>
        <View style={[styles.previewIcon, { backgroundColor: color + '20' }]}>
          <MaterialIcons name={icon as any} size={48} color={color} />
        </View>
        <Text variant="titleLarge" style={{ fontWeight: 'bold', marginTop: 12 }}>
          {name || 'Deck Name'}
        </Text>
      </View>

      <View style={styles.form}>
        <TextInput
          label="Deck Name"
          value={name}
          onChangeText={setName}
          mode="outlined"
          style={styles.input}
          maxLength={50}
        />

        <TextInput
          label="Description (optional)"
          value={description}
          onChangeText={setDescription}
          mode="outlined"
          style={styles.input}
          multiline
          maxLength={200}
        />

        <Text variant="titleSmall" style={{ marginBottom: 8, color: theme.colors.onBackground }}>Color</Text>
        <View style={styles.colorGrid}>
          {DECK_COLORS.map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              style={[
                styles.colorItem,
                { backgroundColor: c },
                color === c && { borderWidth: 3, borderColor: theme.colors.onBackground },
              ]}
            />
          ))}
        </View>

        <Text variant="titleSmall" style={{ marginTop: 16, marginBottom: 8, color: theme.colors.onBackground }}>Icon</Text>
        <View style={styles.iconGrid}>
          {DECK_ICONS.map((i) => (
            <Pressable
              key={i}
              onPress={() => setIcon(i)}
              style={[
                styles.iconItem,
                { backgroundColor: theme.colors.surfaceVariant },
                icon === i && { backgroundColor: color + '30', borderWidth: 2, borderColor: color },
              ]}
            >
              <MaterialIcons name={i as any} size={24} color={icon === i ? color : theme.colors.onSurfaceVariant} />
            </Pressable>
          ))}
        </View>

        <Button
          mode="contained"
          onPress={handleCreate}
          disabled={!name.trim() || saving}
          loading={saving}
          style={styles.button}
          contentStyle={{ height: 48 }}
        >
          Create Deck
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  preview: { alignItems: 'center', paddingVertical: 32 },
  previewIcon: { width: 80, height: 80, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  form: { padding: 16 },
  input: { marginBottom: 16 },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  colorItem: { width: 40, height: 40, borderRadius: 20 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  iconItem: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  button: { marginTop: 24, borderRadius: 12 },
});
