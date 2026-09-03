import React, { useCallback, useEffect } from "react";
import { View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts, Newsreader_400Regular, Newsreader_500Medium, Newsreader_600SemiBold } from "@expo-google-fonts/newsreader";
import {
  PublicSans_400Regular,
  PublicSans_500Medium,
  PublicSans_600SemiBold,
  PublicSans_700Bold,
} from "@expo-google-fonts/public-sans";
import { AuthProvider, useAuth } from "./src/state/AuthContext";
import { AppDataProvider } from "./src/state/AppDataContext";
import { LanguageProvider } from "./src/i18n/LanguageContext";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { PAPER } from "./src/theme/colors";

SplashScreen.preventAutoHideAsync().catch(() => {});

function Gate({ onReady }: { onReady: boolean }) {
  const { loading } = useAuth();
  const ready = onReady && !loading;

  const handleLayout = useCallback(async () => {
    if (ready) await SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <View style={{ flex: 1 }} onLayout={handleLayout}>
      <AppDataProvider>
        <LanguageProvider>
          <NavigationContainer>
            <StatusBar style="dark" />
            <RootNavigator />
          </NavigationContainer>
        </LanguageProvider>
      </AppDataProvider>
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Newsreader_400Regular,
    Newsreader_500Medium,
    Newsreader_600SemiBold,
    PublicSans_400Regular,
    PublicSans_500Medium,
    PublicSans_600SemiBold,
    PublicSans_700Bold,
  });

  return (
    <SafeAreaProvider style={{ backgroundColor: PAPER }}>
      <AuthProvider>
        <Gate onReady={!!fontsLoaded} />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
