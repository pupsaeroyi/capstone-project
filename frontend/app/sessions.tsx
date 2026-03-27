import { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, TextInput, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { r } from "@/utils/responsive";
import { API_BASE, authFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/Input";

type SessionItem = {
  session_id: number;
  sport: string;
  player_count: number;
  max_players: number;
  start_time: string;
  end_time: string;
  venue_id: number;
  venue_name: string;
  venue_rating: number;
  created_by: number;
  player_ids: number[];
};

export default function SessionsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/sessions`);
      const data = await res.json();
      if (data.ok) setSessions(data.sessions);
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSessions();
  };

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

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  };

  const filtered = sessions.filter(s =>
    s.venue_name.toLowerCase().includes(search.toLowerCase())
  );

  const renderSession = ({ item }: { item: SessionItem }) => {
    const slotsLeft = item.max_players - item.player_count;
    const isFull = slotsLeft <= 0;
    const hasJoined = user ? (item.player_ids || []).includes(user.id) : false;

    return (
      <TouchableOpacity
        style={styles.sessionCard}
        onPress={() => router.push(`/session/${item.session_id}`)}
        activeOpacity={0.7}
      >
        {/* Top row: venue name + rating */}
        <View style={styles.cardTopRow}>
          <Text style={styles.venueName} numberOfLines={1}>{item.venue_name}</Text>
          <View style={styles.ratingBadge}>
            <MaterialIcons name="star" size={r(12)} color="#FBBF24" />
            <Text style={styles.ratingText}>{item.venue_rating}</Text>
          </View>
        </View>

        {/* Time + date */}
        <View style={styles.timeRow}>
          <MaterialIcons name="schedule" size={r(14)} color="#64748B" />
          <Text style={styles.timeText}>
            {formatTime(item.start_time)} - {formatTime(item.end_time)}
          </Text>
          <Text style={styles.dateChip}>{formatDate(item.start_time)}</Text>
        </View>

        {/* Bottom row: players + join */}
        <View style={styles.cardBottomRow}>
          <View style={styles.playerInfo}>
            <MaterialIcons name="groups" size={r(18)} color="#64748B" />
            <Text style={styles.playerText}>+{item.player_count}</Text>
            <Text style={styles.maxText}>/{item.max_players}</Text>
          </View>

          {hasJoined ? (
            <View style={styles.joinedBadge}>
              <Text style={styles.joinedText}>Joined</Text>
            </View>
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
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="chevron-back" size={28} color="#000" onPress={() => router.back()} />

          <Input
            placeholder="Search here"
            value={search}
            onChangeText={setSearch}
            showSearchIcon
            style={styles.searchBar}
          />

      </View>

      {/* Filter chips */}
      <View style={styles.chipsRow}>
        <TouchableOpacity
          style={styles.chipOutline}
          onPress={() => router.push("/map")}
        >
          <MaterialIcons name="map" size={r(14)} color="#EF4444" />
          <Text style={styles.chipText}>Map</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.chipOutline}>
          <MaterialIcons name="filter-list" size={r(14)} color="#0F172A" />
          <Text style={styles.chipText}>Filter</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.createChip}
          onPress={() => router.push("/create-session")}
        >
          <MaterialIcons name="add" size={r(14)} color="#FFFFFF" />
          <Text style={styles.createChipText}>Create room</Text>
        </TouchableOpacity>
      </View>

      {/* Sessions list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.session_id.toString()}
        renderItem={renderSession}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0B36F4"]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="event-busy" size={r(48)} color="#CBD5E1" />
            <Text style={styles.emptyText}>
              {search ? "No sessions match your search" : "No active sessions"}
            </Text>
          </View>
        }
      />
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
    gap: r(10),
    paddingTop: r(50),
    paddingBottom: r(12),
    paddingHorizontal: r(16),
    backgroundColor: "#FFFFFF",
  },
  backButton: {
    padding: r(4),
  },
  
  searchBar: {
    flex: 1,
  },

  filterIconButton: {
    padding: r(8),
    backgroundColor: "#F1F5F9",
    borderRadius: r(20),
  },
  chipsRow: {
    flexDirection: "row",
    gap: r(8),
    paddingHorizontal: r(16),
    paddingVertical: r(12),
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  chipOutline: {
    flexDirection: "row",
    alignItems: "center",
    gap: r(4),
    paddingHorizontal: r(12),
    paddingVertical: r(6),
    borderRadius: r(16),
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chipText: {
    fontSize: r(12),
    fontFamily: "Lexend_500Medium",
    color: "#0F172A",
  },
  createChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: r(4),
    paddingHorizontal: r(12),
    paddingVertical: r(6),
    borderRadius: r(16),
    backgroundColor: "#0B36F4",
  },
  createChipText: {
    fontSize: r(12),
    fontFamily: "Lexend_600SemiBold",
    color: "#FFFFFF",
  },
  listContent: {
    padding: r(16),
    paddingBottom: r(40),
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
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: r(8),
  },
  venueName: {
    fontSize: r(16),
    fontFamily: "Lexend_700Bold",
    color: "#0F172A",
    flex: 1,
    marginRight: r(8),
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: r(2),
  },
  ratingText: {
    fontSize: r(12),
    fontFamily: "Lexend_600SemiBold",
    color: "#0F172A",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: r(6),
    marginBottom: r(12),
  },
  timeText: {
    fontSize: r(13),
    fontFamily: "Lexend_400Regular",
    color: "#64748B",
  },
  dateChip: {
    fontSize: r(11),
    fontFamily: "Lexend_500Medium",
    color: "#0B36F4",
    backgroundColor: "#E6EAFD",
    paddingHorizontal: r(8),
    paddingVertical: r(2),
    borderRadius: r(8),
    overflow: "hidden",
  },
  cardBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  playerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: r(4),
  },
  playerText: {
    fontSize: r(14),
    fontFamily: "Lexend_600SemiBold",
    color: "#0F172A",
  },
  maxText: {
    fontSize: r(12),
    fontFamily: "Lexend_400Regular",
    color: "#94A3B8",
  },
  joinButton: {
    backgroundColor: "#0B36F4",
    paddingHorizontal: r(24),
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
  joinedBadge: {
    backgroundColor: "#E6EAFD",
    paddingHorizontal: r(16),
    paddingVertical: r(8),
    borderRadius: r(20),
  },
  joinedText: {
    fontSize: r(13),
    fontFamily: "Lexend_600SemiBold",
    color: "#0B36F4",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: r(80),
    gap: r(12),
  },
  emptyText: {
    fontSize: r(14),
    fontFamily: "Lexend_400Regular",
    color: "#94A3B8",
  },
});
