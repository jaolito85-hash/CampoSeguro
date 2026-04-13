import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { getDbSync } from '../src/data/database';

export default function RootLayout() {
  getDbSync();

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
