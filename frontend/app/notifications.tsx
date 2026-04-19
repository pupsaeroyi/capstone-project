import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl, useWindowDimensions } from "react-native";
import { useState, useCallback, useEffect } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { API_BASE } from "@/lib/api";
import { r } from "@/utils/responsive";

type NotificationItem = {
  id: number;
  type: "friend_request" | "like" | "comment";
  actor_user_id: number;
  actor_username: string;
  actor_avatar: string | null;
  post_id: number | null;
  post_preview: string | null;
  comment_preview: string | null;
  created_at: string;
  unread: boolean;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());
  const { height } = useWindowDimensions();

  const load = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      const res = await fetch(`${API_BASE}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) setItems(data.notifications);
    } catch (err) {
      console.error("Load notifications error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      await fetch(`${API_BASE}/api/notifications/mark-read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error("Mark-read error:", err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Mark read when the screen is opened
  useEffect(() => {
    markAllRead();
  }, [markAllRead]);

  const setBusy = (id: number, busy: boolean) => {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const accept = async (requesterId: number) => {
    setBusy(requesterId, true);
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      const res = await fetch(`${API_BASE}/api/friends/accept`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requesterId }),
      });
      const data = await res.json();
      if (data.ok) {
        setItems((prev) =>
          prev.filter(
            (n) => !(n.type === "friend_request" && n.actor_user_id === requesterId)
          )
        );
      }
    } catch (err) {
      console.error("Accept error:", err);
    } finally {
      setBusy(requesterId, false);
    }
  };

  const decline = async (requesterId: number) => {
    setBusy(requesterId, true);
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      const res = await fetch(`${API_BASE}/api/friends/${requesterId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) {
        setItems((prev) =>
          prev.filter(
            (n) => !(n.type === "friend_request" && n.actor_user_id === requesterId)
          )
        );
      }
    } catch (err) {
      console.error("Decline error:", err);
    } finally {
      setBusy(requesterId, false);
    }
  };

  const openActor = (userId: number) => {
    router.push({ pathname: "/viewprofile" as any, params: { userId } });
  };

  const openPost = (postId: number | null) => {
    if (!postId) return;
    router.push(`/post/${postId}` as any);
  };

  const renderRow = ({ item }: { item: NotificationItem }) => {
    const busy = busyIds.has(item.actor_user_id);

    const avatar = item.actor_avatar ? (
      <Image source={{ uri: item.actor_avatar }} style={styles.avatar} />
    ) : (
      <View style={[styles.avatar, styles.avatarPlaceholder]}>
        <Text style={styles.avatarInitial}>{item.actor_username[0]?.toUpperCase()}</Text>
      </View>
    );

    const badge =
      item.type === "like" ? (
        <View style={[styles.typeBadge, { backgroundColor: "#EF4444" }]}>
          <Ionicons name="heart" size={r(10)} color="#fff" />
        </View>
      ) : item.type === "comment" ? (
        <View style={[styles.typeBadge, { backgroundColor: "#0B36F4" }]}>
          <Ionicons name="chatbubble" size={r(9)} color="#fff" />
        </View>
      ) : (
        <View style={[styles.typeBadge, { backgroundColor: "#10B981" }]}>
          <MaterialIcons name="person-add-alt-1" size={r(10)} color="#fff" />
        </View>
      );

    let message: React.ReactNode;
    let onRowPress: (() => void) | undefined;

    if (item.type === "friend_request") {
      message = (
        <Text style={styles.message}>
          <Text style={styles.actor}>{item.actor_username}</Text> sent you a friend request
        </Text>
      );
      onRowPress = () => openActor(item.actor_user_id);
    } else if (item.type === "like") {
      message = (
        <Text style={styles.message}>
          <Text style={styles.actor}>{item.actor_username}</Text> liked your post
          {item.post_preview ? <Text style={styles.preview}>: “{item.post_preview}”</Text> : null}
        </Text>
      );
      onRowPress = () => openPost(item.post_id);
    } else {
      message = (
        <Text style={styles.message}>
          <Text style={styles.actor}>{item.actor_username}</Text> commented on your post
          {item.comment_preview ? (
            <Text style={styles.preview}>: “{item.comment_preview}”</Text>
          ) : null}
        </Text>
      );
      onRowPress = () => openPost(item.post_id);
    }

    return (
      <TouchableOpacity
        style={[styles.row, item.unread && styles.rowUnread]}
        activeOpacity={0.7}
        onPress={onRowPress}
      >
        <View style={styles.avatarWrap}>
          {avatar}
          {badge}
        </View>

        <View style={styles.body}>
          {message}
          <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
        </View>

        {item.type === "friend_request" && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.acceptBtn, busy && styles.btnDisabled]}
              onPress={() => accept(item.actor_user_id)}
              disabled={busy}
            >
              <Ionicons name="checkmark" size={r(18)} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.declineBtn, busy && styles.btnDisabled]}
              onPress={() => decline(item.actor_user_id)}
              disabled={busy}
            >
              <Ionicons name="close" size={r(18)} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#0B36F4" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={r(26)} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: r(34) }} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor="#0B36F4"
          />
        }
        ListEmptyComponent={
          <View style={[styles.empty, { height: height * 0.7 }]}>
            <MaterialIcons name="notifications-none" size={r(40)} color="#CBD5E1" />
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        }
        renderItem={renderRow}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: r(50),
    paddingHorizontal: r(16),
    paddingBottom: r(12),
    borderBottomColor: "#F1F5F9",
    borderBottomWidth: 1,
  },
  backBtn: { padding: r(4) },
  headerTitle: { fontFamily: "Lexend_700Bold", fontSize: r(16), color: "#0F172A" },
  listContent: { paddingVertical: r(8), flexGrow: 1 },
  empty: { justifyContent: "center", alignItems: "center", gap: r(10) },
  emptyText: { color: "#94A3B8", fontFamily: "Lexend_500Medium", fontSize: r(14) },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: r(12),
    paddingHorizontal: r(16),
    gap: r(12),
    backgroundColor: "#fff",
  },
  rowUnread: { backgroundColor: "#F0F4FF" },
  avatarWrap: { width: r(44), height: r(44), position: "relative" },
  avatar: { width: r(44), height: r(44), borderRadius: r(22) },
  avatarPlaceholder: {
    backgroundColor: "#0B36F4",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { color: "#fff", fontFamily: "Lexend_700Bold", fontSize: r(16) },
  typeBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: r(18),
    height: r(18),
    borderRadius: r(9),
    borderWidth: 2,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, gap: r(2) },
  message: { fontFamily: "Lexend_400Regular", fontSize: r(13), color: "#0F172A", lineHeight: r(18) },
  actor: { fontFamily: "Lexend_700Bold", color: "#0F172A" },
  preview: { fontFamily: "Lexend_400Regular", color: "#64748B" },
  time: { fontFamily: "Lexend_400Regular", fontSize: r(11), color: "#94A3B8" },
  actions: { flexDirection: "row", gap: r(6) },
  acceptBtn: {
    width: r(34),
    height: r(34),
    borderRadius: r(17),
    backgroundColor: "#0B36F4",
    alignItems: "center",
    justifyContent: "center",
  },
  declineBtn: {
    width: r(34),
    height: r(34),
    borderRadius: r(17),
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: { opacity: 0.6 },
});
