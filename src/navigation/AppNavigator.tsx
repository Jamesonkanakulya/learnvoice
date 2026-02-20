import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { RootStackParamList, TabParamList } from '../types';

import HomeScreen from '../screens/HomeScreen';
import DecksScreen from '../screens/DecksScreen';
import StatsScreen from '../screens/StatsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import DeckDetailScreen from '../screens/DeckDetailScreen';
import CreateDeckScreen from '../screens/CreateDeckScreen';
import EditDeckScreen from '../screens/EditDeckScreen';
import AddQuestionScreen from '../screens/AddQuestionScreen';
import EditQuestionScreen from '../screens/EditQuestionScreen';
import StudySessionScreen from '../screens/StudySessionScreen';
import SessionResultsScreen from '../screens/SessionResultsScreen';
import AchievementsScreen from '../screens/AchievementsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function MainTabs() {
  const theme = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
          height: 64,
          paddingBottom: 8,
          paddingTop: 4,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => <MaterialIcons name="home" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Decks"
        component={DecksScreen}
        options={{
          tabBarIcon: ({ color, size }) => <MaterialIcons name="library-books" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <MaterialIcons name="bar-chart" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <MaterialIcons name="settings" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const theme = useTheme();
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.onSurface,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="DeckDetail" component={DeckDetailScreen} options={{ title: 'Deck' }} />
        <Stack.Screen name="CreateDeck" component={CreateDeckScreen} options={{ title: 'Create Deck' }} />
        <Stack.Screen name="EditDeck" component={EditDeckScreen} options={{ title: 'Edit Deck' }} />
        <Stack.Screen name="AddQuestion" component={AddQuestionScreen} options={{ title: 'Add Question' }} />
        <Stack.Screen name="EditQuestion" component={EditQuestionScreen} options={{ title: 'Edit Question' }} />
        <Stack.Screen name="StudySession" component={StudySessionScreen} options={{ headerShown: false }} />
        <Stack.Screen name="SessionResults" component={SessionResultsScreen} options={{ title: 'Results', headerBackVisible: false }} />
        <Stack.Screen name="Achievements" component={AchievementsScreen} options={{ title: 'Achievements' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
