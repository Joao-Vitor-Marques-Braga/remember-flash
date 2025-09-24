import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { SQLiteProvider } from 'expo-sqlite';
import { migrateDb } from '@/lib/db';
import { ThemeOverrideProvider, useThemeOverride } from '@/lib/theme-override';

export const unstable_settings = {};

function RootInner() {
  const system = useColorScheme();
  const { scheme } = useThemeOverride();
  const effective = scheme ?? system;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={effective === 'dark' ? DarkTheme : DefaultTheme}>
        <SQLiteProvider databaseName="rememberflash.db" onInit={migrateDb}>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="category" options={{ title: 'Cards' }} />
            <Stack.Screen name="practice" options={{ presentation: 'modal', title: 'Prática' }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Configurar IA' }} />
          </Stack>
          <StatusBar style="auto" />
        </SQLiteProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <ThemeOverrideProvider>
      <RootInner />
    </ThemeOverrideProvider>
  );
}
