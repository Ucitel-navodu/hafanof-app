import { Platform } from "react-native";

// Override at build/run time with EXPO_PUBLIC_API_URL for a physical device or LAN host.
const fromEnv = process.env.EXPO_PUBLIC_API_URL;

function defaultHost() {
  if (Platform.OS === "android") return "http://10.0.2.2:4000";
  return "http://localhost:4000";
}

export const API_BASE_URL = fromEnv && fromEnv.length > 0 ? fromEnv : defaultHost();
