import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useState, useCallback } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { API_BASE } from "@/lib/api";
import { r } from "@/utils/responsive";

type FriendRequest = {
  friendship_id: number;
  requester_id: number;
  username: string;
  avatar_url: string | null;
  created_at: string;
};

export default function FriendRequestsScreen() {
  const router = useRouter();
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      const res = await fetch(`${API_BASE}/api/friends/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) setRequests(data.requests);
    } catch (err) {
      console.error("Load pending requests error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const markBusy = (userId: number, busy: boolean) => {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(userId);
      else next.delete(userId);
      return next;
    });
  };

  const accept = async (requesterId: number) => {
    markBusy(requesterId, true);
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
        setRequests((prev) => prev.filter((r) => r.requester_id !== requesterId));
      }
    } catch (err) {
      console.error("Accept error:", err);
    } finally {
      markBusy(requesterId, false);
    }
  };

  const decline = async (requesterId: number) => {
    markBusy(requesterId, true);
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      const res = await fetch(`${API_BASE}/api/friends/${requesterId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) {
        setRequests((prev) => prev.filter((r) => r.requester_id !== requesterId));
      }
    } catch (err) {
      console.error("Decline error:", err);
    } finally {
      markBusy(requesterId, false);
    }
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
        <Text style={styles.headerTitle}>Friend Requests</Text>
        <View style={{ width: r(34) }} />
      </View>

      <FlatList
        data={requests}
        keyExtractor={(item) => item.friendship_id.toString()}
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
          <View style={styles.empty}>
            <Ionicons name="mail-outline" size={r(36)} color="#CBD5E1" />
            <Text style={styles.emptyText}>No pending requests</Text>
          </View>
        }
        renderItem={({ item }) => {
          const busy = busyIds.has(item.requester_id);
          return (
            <View style={styles.row}>
              <TouchableOpacity
                style={styles.rowLeft}
                onPress={() =>
                  router.push({
                    pathname: "/viewprofile" as any,
                    params: { userId: item.requester_id },
                  })
                }
              >
                {item.avatar_url ? (
                  <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarInitial}>
                      {item.username[0]?.toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.info}>
                  <Text style={styles.username}>{item.username}</Text>
                  <Text style={styles.sub}>wants to be friends</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.acceptBtn, busy && styles.btnDisabled]}
                  onPress={() => accept(item.requester_id)}
                  disabled={busy}
                >
                  <Ionicons name="checkmark" size={r(18)} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.declineBtn, busy && styles.btnDisabled]}
                  onPress={() => decline(item.requester_id)}
                  disabled={busy}
                >
                  <Ionicons name="close" size={r(18)} color="#64748B" />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
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
  headerTitle: {
    fontFamily: "Lexend_700Bold",
    fontSize: r(16),
    color: "#0F172A",
  },
  listContent: { padding: r(16), flexGrow: 1 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: r(80), gap: r(12) },
  emptyText: { color: "#94A3B8", fontFamily: "Lexend_500Medium", fontSize: r(14) },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: r(12),
    borderBottomColor: "#F1F5F9",
    borderBottomWidth: 1,
  },
  rowLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: r(12) },
  avatar: { width: r(44), height: r(44), borderRadius: r(22) },
  avatarPlaceholder: {
    backgroundColor: "#0B36F4",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { color: "#fff", fontFamily: "Lexend_700Bold", fontSize: r(16) },
  info: { flex: 1 },
  username: { fontFamily: "Lexend_600SemiBold", fontSize: r(14), color: "#0F172A" },
  sub: { fontFamily: "Lexend_400Regular", fontSize: r(12), color: "#94A3B8", marginTop: r(2) },
  actions: { flexDirection: "row", gap: r(8) },
  acceptBtn: {
    width: r(36),
    height: r(36),
    borderRadius: r(18),
    backgroundColor: "#0B36F4",
    alignItems: "center",
    justifyContent: "center",
  },
  declineBtn: {
    width: r(36),
    height: r(36),
    borderRadius: r(18),
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: { opacity: 0.6 },
});
