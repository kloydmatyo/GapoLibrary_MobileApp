import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#f0fdf4' },
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen 
        name="resend-verification" 
        options={{ 
          headerShown: true, 
          title: 'Resend Verification',
          headerStyle: { backgroundColor: '#0D6E6E' },
          headerTintColor: '#fff',
        }} 
      />
    </Stack>
  );
}
