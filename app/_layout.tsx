import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { Platform, StatusBar } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import * as Linking from 'expo-linking';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { OverdueProvider } from '@/context/OverdueContext';
import { BookAvailabilityProvider } from '@/context/BookAvailabilityContext';
import FontsProvider from '@/components/FontsProvider';

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    const inVerify = segments[0] === 'verify-email';
    
    if (!user && !inAuth && !inVerify) router.replace('/(auth)/login');
    else if (user && inAuth) router.replace('/(tabs)');
  }, [user, loading, segments]);

  // Handle deep links for email verification
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const { path, queryParams } = Linking.parse(event.url);
      if (path === 'verify-email' && queryParams?.token) {
        router.push(`/verify-email?token=${queryParams.token}`);
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check if app was opened with a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        const { path, queryParams } = Linking.parse(url);
        if (path === 'verify-email' && queryParams?.token) {
          router.push(`/verify-email?token=${queryParams.token}`);
        }
      }
    });

    return () => subscription.remove();
  }, [router]);

  // Hide Android navigation bar
  useEffect(() => {
    const setupBars = async () => {
      if (Platform.OS === 'android') {
        try {
          // Hide navigation bar completely
          await NavigationBar.setVisibilityAsync('hidden');
          
          // Set behavior: inset-swipe keeps it hidden, overlay-swipe shows temporarily
          await NavigationBar.setBehaviorAsync('inset-swipe');
          
          // Hide status bar completely
          StatusBar.setHidden(true, 'none');
          
          console.log('✅ Navigation bar hidden successfully');
        } catch (error) {
          console.error('❌ Navigation bar setup error:', error);
        }
      }
    };

    setupBars();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="books/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="books/borrow" options={{ headerShown: false }} />
      <Stack.Screen name="books/reserve" options={{ headerShown: false }} />
      <Stack.Screen name="events" options={{ headerShown: false }} />
      <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
      <Stack.Screen name="verify-email" options={{ headerShown: true, title: 'Email Verification' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <FontsProvider>
      <AuthProvider>
        <OverdueProvider>
          <BookAvailabilityProvider>
            <RootLayoutNav />
          </BookAvailabilityProvider>
        </OverdueProvider>
      </AuthProvider>
    </FontsProvider>
  );
}
