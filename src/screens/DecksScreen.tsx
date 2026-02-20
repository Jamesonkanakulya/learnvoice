import React, { useCallback, useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Text, Card, FAB, useTheme, Searchbar } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { RootStackParamList, Deck } from '../types';
import { getAllDecks } from '../services/data';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function DecksScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [search, setSearch] = useState('');

  useFocusEffect(
    useCallback(() => {
      getAllDecks().then(setDecks);
    }, [])
  );

  const filtered = search
    ? decks.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()))
    : decks;

  const renderDeck = ({ item }: { item: Deck }) => (
    <Card
      style={[styles.card, { backgroundColor: theme.colors.surface }]}
      onPress={() => navigation.navigate('DeckDetail', { deckId: item.id })}
    >
      <Card.Content style={styles.cardContent}>
        <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
          <MaterialIcons name={item.icon as any} size={32} color={item.color} />
        </View>
        <View style={styles.cardText}>
          <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{item.name}</Text>
          {item.description ? (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
              {item.description}
            </Text>
          ) : null}
          <Text variant="bodySmall" style={{ color: theme.colors.primary, marginTop: 4 }}>
            {item.questionCount} {item.questionCount === 1 ? 'question' : 'questions'}
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
      </Card.Content>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={{ fontWeight: 'bold', color: theme.colors.onBackground }}>
          My Decks
        </Text>
      </View>

      {decks.length > 3 && (
        <Searchbar
          placeholder="Search decks..."
          value={search}
          onChangeText={setSearch}
          style={[styles.search, { backgroundColor: theme.colors.surfaceVariant }]}
          inputStyle={{ fontSize: 14 }}
        />
      )}

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <MaterialIcons name="library-books" size={64} color={theme.colors.onSurfaceVariant} />
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, marginTop: 16, textAlign: 'center' }}>
            {search ? 'No decks found' : 'No decks yet.\nTap + to create your first deck!'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderDeck}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
        onPress={() => navigation.navigate('CreateDeck')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 48, paddingBottom: 16 },
  search: { marginHorizontal: 16, marginBottom: 8, height: 44 },
  list: { padding: 16, paddingBottom: 100 },
  card: { marginBottom: 12, borderRadius: 12 },
  cardContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconContainer: { width: 56, height: 56, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cardText: { flex: 1 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 },
  fab: { position: 'absolute', right: 16, bottom: 16, borderRadius: 16 },
});
