import * as SecureStore from "expo-secure-store";
import { API_BASE } from "@/lib/api";

export async function getSavedToken() {
  return SecureStore.getItemAsync("accessToken");
}

export async function clearSavedToken() {
  return SecureStore.deleteItemAsync("accessToken");
}

export async function fetchMe(token: string) {
  const res = await fetch(`${API_BASE}/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  return { res, data };
}
