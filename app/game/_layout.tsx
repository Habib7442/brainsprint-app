import { Stack } from 'expo-router';
import React from 'react';

export default function GameLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="[id]" />
      <Stack.Screen name="results" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
