import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { Lexend_400Regular, Lexend_500Medium, Lexend_600SemiBold, Lexend_700Bold, Lexend_800ExtraBold } from "@expo-google-fonts/lexend";
import * as SecureStore from "expo-secure-store";
import { useEffect } from "react";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Lexend_400Regular,
    Lexend_500Medium,
    Lexend_600SemiBold,
    Lexend_700Bold,
    Lexend_800ExtraBold,
  });

  useEffect(() => {
    async function checkRemember() {
      const remember = await SecureStore.getItemAsync("rememberMe");
      const token = await SecureStore.getItemAsync("accessToken");

      if (remember !== "true" && token) {
        await SecureStore.deleteItemAsync("accessToken");
      }
    }

    checkRemember();
  }, []);


  if (!fontsLoaded) {
    return null;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
