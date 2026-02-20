import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6C63FF',
    primaryContainer: '#E8E6FF',
    secondary: '#03DAC6',
    secondaryContainer: '#C8FFF4',
    tertiary: '#FF6584',
    background: '#F8F9FA',
    surface: '#FFFFFF',
    surfaceVariant: '#F0F0F5',
    error: '#FF4444',
    success: '#4CAF50',
    warning: '#FF9800',
    onPrimary: '#FFFFFF',
    onSecondary: '#000000',
    onBackground: '#1A1A2E',
    onSurface: '#1A1A2E',
    onSurfaceVariant: '#666680',
    outline: '#E0E0E8',
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#8B83FF',
    primaryContainer: '#2D2A5E',
    secondary: '#03DAC6',
    secondaryContainer: '#004D40',
    tertiary: '#FF6584',
    background: '#121218',
    surface: '#1E1E2A',
    surfaceVariant: '#2A2A3A',
    error: '#FF6B6B',
    success: '#66BB6A',
    warning: '#FFA726',
    onPrimary: '#FFFFFF',
    onSecondary: '#000000',
    onBackground: '#EAEAEF',
    onSurface: '#EAEAEF',
    onSurfaceVariant: '#9999AA',
    outline: '#3A3A4A',
  },
};

export const DECK_COLORS = [
  '#6C63FF', '#FF6584', '#03DAC6', '#FF9800',
  '#4CAF50', '#2196F3', '#9C27B0', '#F44336',
  '#00BCD4', '#8BC34A', '#FF5722', '#607D8B',
];

export const DECK_ICONS = [
  'book', 'school', 'science', 'language',
  'calculate', 'history-edu', 'psychology', 'music-note',
  'code', 'fitness-center', 'palette', 'public',
];
