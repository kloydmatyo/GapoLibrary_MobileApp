import { useEffect, ReactNode } from 'react';
import { useFonts } from 'expo-font';
import {
  Lora_400Regular,
  Lora_700Bold,
} from '@expo-google-fonts/lora';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function FontsProvider({ children }: { children: ReactNode }) {
  const [loaded] = useFonts({
    Lora_400Regular,
    Lora_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);

  if (!loaded) return null;

  return <>{children}</>;
}
