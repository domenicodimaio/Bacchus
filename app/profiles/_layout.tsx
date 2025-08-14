import { Stack } from 'expo-router';

export default function ProfilesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen 
        name="index" 
        options={{
          animation: 'slide_from_right'
        }}
      />
      <Stack.Screen 
        name="edit" 
        options={{
          gestureEnabled: false,
          gestureDirection: 'horizontal',
          animation: 'slide_from_right'
        }}
      />
      <Stack.Screen name="create" />
    </Stack>
  );
} 