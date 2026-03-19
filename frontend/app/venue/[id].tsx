import { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { r } from "@/utils/responsive";
import { API_BASE, authFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type SessionItem = {
  session_id: number;
  sport: string;
  player_count: number;
  max_players: number;
  start_time: string;
  end_time: string;
  created_by: number;
  player_ids: number[];
};

export default function VenueDetailScreen() {
  const { id, venue_name } = useLocalSearchParams<{ id: string; venue_name: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(() => {
    setLoading(true);
    fetch(`${API_BASE}/venues/${id}/sessions`)
      .then(res => res.json())
      .then(data => {
        if (data.ok) setSessions(data.sessions);
      })
      .catch(err => console.error("Failed to fetch sessions:", err))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleJoin = async (sessionId: number) => {
    try {
      const data = await authFetch(`/sessions/${sessionId}/join`, { method: "POST" });
      if (data.ok) {
        Alert.alert("Joined!", `You're in. ${data.player_count} players now.`);
        fetchSessions();
      } else {
        Alert.alert("Cannot Join", data.message || "Something went wrong");
      }
    } catch (err) {
      Alert.alert("Error", "Failed to join session");
    }
  };

  const handleLeave = async (sessionId: number) => {
    Alert.alert("Leave Session", "Are you sure you want to leave?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          try {
            const data = await authFetch(`/sessions/${sessionId}/leave`, { method: "POST" });
            if (data.ok) {
              Alert.alert("Left", "You have left the session.");
              fetchSessions();
            } else {
              Alert.alert("Error", data.message || "Something went wrong");
            }
          } catch (err) {
            Alert.alert("Error", "Failed to leave session");
          }
        },
      },
    ]);
  };

  const handleCancel = async (sessionId: number) => {
    Alert.alert("Cancel Session", "This will remove the session for all players. Are you sure?", [
      { text: "No", style: "cancel" },
      {
        text: "Cancel Session",
        style: "destructive",
        onPress: async () => {
          try {
            const data = await authFetch(`/sessions/${sessionId}`, { method: "DELETE" });
            if (data.ok) {
              Alert.alert("Cancelled", "Session has been cancelled.");
              fetchSessions();
            } else {
              Alert.alert("Error", data.message || "Something went wrong");
            }
          } catch (err) {
            Alert.alert("Error", "Failed to cancel session");
          }
        },
      },
    ]);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  };

  const renderSession = ({ item }: { item: SessionItem }) => {
    const slotsLeft = item.max_players - item.player_count;
    const isFull = slotsLeft <= 0;
    const isCreator = user?.id === item.created_by;
    const hasJoined = user ? (item.player_ids || []).includes(user.id) : false;

    return (
      <TouchableOpacity
        style={styles.sessionCard}
        onPress={() => router.push(`/session/${item.session_id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.sessionHeader}>
          <View style={styles.sportBadge}>
            <Text style={styles.sportText}>{item.sport}</Text>
          </View>
          <Text style={styles.dateText}>{formatDate(item.start_time)}</Text>
        </View>

        <Text style={styles.timeText}>
          {formatTime(item.start_time)} - {formatTime(item.end_time)}
        </Text>

        <View style={styles.sessionFooter}>
          <View style={styles.playerInfo}>
            <MaterialIcons name="groups" size={r(18)} color="#64748B" />
            <Text style={styles.playerText}>
              {item.player_count}/{item.max_players} players
            </Text>
          </View>

          <View style={styles.actionRow}>
            {isCreator ? (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => handleCancel(item.session_id)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            ) : hasJoined ? (
              <TouchableOpacity
                style={styles.leaveButton}
                onPress={() => handleLeave(item.session_id)}
              >
                <Text style={styles.leaveText}>Leave</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.joinButton, isFull && styles.joinButtonDisabled]}
                onPress={() => handleJoin(item.session_id)}
                disabled={isFull}
              >
                <Text style={[styles.joinText, isFull && styles.joinTextDisabled]}>
                  {isFull ? "Full" : "Join"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="chevron-back" size={28} color="#000" onPress={() => router.back()} />
        <Text style={styles.headerTitle} numberOfLines={1}>{venue_name || "Venue"}</Text>
        <View style={{ width: r(24) }} />
      </View>

      {/* Sessions list */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0B36F4" />
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.centered}>
          <MaterialIcons name="event-busy" size={r(48)} color="#CBD5E1" />
          <Text style={styles.emptyText}>No active sessions</Text>
          <Text style={styles.emptySubtext}>Be the first to create one!</Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.session_id.toString()}
          renderItem={renderSession}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Create Session FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() =>
          router.push({
            pathname: "/create-session",
            params: { venue_id: id, venue_name: venue_name || "" },
          })
        }
      >
        <MaterialIcons name="add" size={r(28)} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: r(50),
    paddingBottom: r(16),
    paddingHorizontal: r(20),
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backButton: {
    padding: r(4),
  },
  headerTitle: {
    fontSize: r(18),
    fontFamily: "Lexend_700Bold",
    color: "#0F172A",
    flex: 1,
    textAlign: "center",
    marginHorizontal: r(12),
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: r(8),
  },
  emptyText: {
    fontSize: r(16),
    fontFamily: "Lexend_600SemiBold",
    color: "#64748B",
    marginTop: r(8),
  },
  emptySubtext: {
    fontSize: r(13),
    fontFamily: "Lexend_400Regular",
    color: "#94A3B8",
  },
  listContent: {
    padding: r(20),
    paddingBottom: r(100),
  },
  sessionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: r(16),
    padding: r(16),
    marginBottom: r(12),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: r(8),
  },
  sportBadge: {
    backgroundColor: "#E6EAFD",
    paddingHorizontal: r(10),
    paddingVertical: r(4),
    borderRadius: r(12),
  },
  sportText: {
    fontSize: r(12),
    fontFamily: "Lexend_600SemiBold",
    color: "#0B36F4",
    textTransform: "capitalize",
  },
  dateText: {
    fontSize: r(12),
    fontFamily: "Lexend_400Regular",
    color: "#94A3B8",
  },
  timeText: {
    fontSize: r(16),
    fontFamily: "Lexend_600SemiBold",
    color: "#0F172A",
    marginBottom: r(12),
  },
  sessionFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  playerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: r(6),
  },
  playerText: {
    fontSize: r(13),
    fontFamily: "Lexend_400Regular",
    color: "#64748B",
  },
  actionRow: {
    flexDirection: "row",
    gap: r(8),
  },
  joinButton: {
    backgroundColor: "#0B36F4",
    paddingHorizontal: r(20),
    paddingVertical: r(8),
    borderRadius: r(20),
  },
  joinButtonDisabled: {
    backgroundColor: "#E2E8F0",
  },
  joinText: {
    fontSize: r(13),
    fontFamily: "Lexend_600SemiBold",
    color: "#FFFFFF",
  },
  joinTextDisabled: {
    color: "#94A3B8",
  },
  leaveButton: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: r(20),
    paddingVertical: r(8),
    borderRadius: r(20),
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  leaveText: {
    fontSize: r(13),
    fontFamily: "Lexend_600SemiBold",
    color: "#EF4444",
  },
  cancelButton: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: r(20),
    paddingVertical: r(8),
    borderRadius: r(20),
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  cancelText: {
    fontSize: r(13),
    fontFamily: "Lexend_600SemiBold",
    color: "#EF4444",
  },
  fab: {
    position: "absolute",
    bottom: r(30),
    right: r(20),
    width: r(56),
    height: r(56),
    borderRadius: r(28),
    backgroundColor: "#0B36F4",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0B36F4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
