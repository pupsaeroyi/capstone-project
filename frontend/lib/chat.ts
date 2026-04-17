import { authFetch } from "@/lib/api";
import type { Router } from "expo-router";

// Open (or create) a private conversation with another user and navigate there.
export async function openDirectChat(
  otherUserId: number,
  router: Router
): Promise<void> {
  const data = await authFetch("/conversations/direct", {
    method: "POST",
    body: JSON.stringify({ other_user_id: otherUserId }),
  });

  if (!data.ok || !data.conversation_id) {
    throw new Error(data.message || "Failed to open chat");
  }

  router.push({
    pathname: "/chat/[id]" as any,
    params: { id: String(data.conversation_id) },
  });
}
