import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

export const LOCAL_API =
  Platform.OS === "android"
    ? "http://10.0.2.2:3000/"
    : "http://localhost:3000/";

const PROD_API = "https://capstone-project-t6ye.onrender.com";

export const API_BASE = PROD_API;

export async function authFetch(path: string, options: RequestInit = {}) {
  const token = await SecureStore.getItemAsync("accessToken");
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string>),
    },
  }).then(res => res.json());
}
