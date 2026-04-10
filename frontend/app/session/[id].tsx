import { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { r } from "@/utils/responsive";
import { API_BASE, authFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type Player = {
  user_id: number;
  username: string;
};

type SessionDetail = {
  session_id: number;
  sport: string;
  session_name: string | null;
  skill_level: string;
  max_players: number;
  start_time: string;
  end_time: string;
  created_by: number;
  description: string | null;
  venue_id: number;
  venue_name: string;
  condition_label: string | null;
  host_username: string;
  player_count: number;
  players: Player[];
  is_ended: boolean;
  has_rated: boolean;
  is_finalized: boolean;
};

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    setLoading(true);
    try {
      const data = await authFetch(`/sessions/${id}`);
      if (data.ok) setSession(data.session);
    } catch (err) {
      console.error("Failed to fetch session:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const isCreator = user?.id === session?.created_by;
  const hasJoined = session ? session.players.some(p => p.user_id === user?.id) : false;
  const isFull = session ? session.player_count >= session.max_players : false;

  const handleJoin = async () => {
    try {
      const data = await authFetch(`/sessions/${id}/join`, { method: "POST" });
      if (data.ok) {
        Alert.alert("Joined!", `You're in. ${data.player_count} players now.`);
        fetchSession();
      } else {
        Alert.alert("Cannot Join", data.message || "Something went wrong");
      }
    } catch {
      Alert.alert("Error", "Failed to join session");
    }
  };

  const handleLeave = () => {
    Alert.alert("Leave Session", "Are you sure you want to leave?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          try {
            const data = await authFetch(`/sessions/${id}/leave`, { method: "POST" });
            if (data.ok) {
              Alert.alert("Left", "You have left the session.");
              fetchSession();
            } else {
              Alert.alert("Error", data.message || "Something went wrong");
            }
          } catch {
            Alert.alert("Error", "Failed to leave session");
          }
        },
      },
    ]);
  };

  const handleCancel = () => {
    Alert.alert("Cancel Session", "This will remove the session for all players. Are you sure?", [
      { text: "No", style: "cancel" },
      {
        text: "Cancel Session",
        style: "destructive",
        onPress: async () => {
          try {
            const data = await authFetch(`/sessions/${id}`, { method: "DELETE" });
            if (data.ok) {
              Alert.alert("Cancelled", "Session has been cancelled.", [
                { text: "OK", onPress: () => router.back() },
              ]);
            } else {
              Alert.alert("Error", data.message || "Something went wrong");
            }
          } catch {
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
    return d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
  };

  const skillLabel = (level: string) => {
    const map: Record<string, string> = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced", pro: "Pro", all: "All Levels" };
    return map[level] || level;
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#0B36F4" />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={[styles.container, styles.centered]}>
        <MaterialIcons name="error-outline" size={r(48)} color="#CBD5E1" />
        <Text style={styles.emptyText}>Session not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.linkText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="chevron-back" size={28} color="#000" onPress={() => router.back()} />
        <Text style={styles.headerTitle} numberOfLines={1}>Session Details</Text>
        <View style={{ width: r(24) }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Session name + sport */}
        <View style={styles.titleSection}>
          <Text style={styles.sessionName}>
            {session.session_name || `${session.sport} Session`}
          </Text>
          <View style={styles.badgeRow}>
            <View style={styles.sportBadge}>
              <Text style={styles.sportText}>{session.sport}</Text>
            </View>
            <View style={styles.skillBadge}>
              <Text style={styles.skillText}>{skillLabel(session.skill_level)}</Text>
            </View>
          </View>
        </View>

        {/* Venue info */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <MaterialIcons name="location-on" size={r(20)} color="#0B36F4" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Venue</Text>
              <Text style={styles.infoValue}>{session.venue_name}</Text>
              {session.condition_label && (
                <Text style={styles.infoSubtext}>{session.condition_label}</Text>
              )}
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <MaterialIcons name="calendar-today" size={r(20)} color="#0B36F4" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Date & Time</Text>
              <Text style={styles.infoValue}>{formatDate(session.start_time)}</Text>
              <Text style={styles.infoSubtext}>
                {formatTime(session.start_time)} - {formatTime(session.end_time)}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <MaterialIcons name="person" size={r(20)} color="#0B36F4" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Host</Text>
              <Text style={styles.infoValue}>{session.host_username}</Text>
            </View>
          </View>
        </View>

        {/* Players */}
        <View style={styles.playersSection}>
          <View style={styles.playersSectionHeader}>
            <Text style={styles.sectionTitle}>Players</Text>
            <Text style={styles.playerCount}>
              {session.player_count}/{session.max_players}
            </Text>
          </View>

          {/* Progress bar */}
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min((session.player_count / session.max_players) * 100, 100)}%` },
              ]}
            />
          </View>

          {/* Player list */}
          {session.players.map((player) => (
            <View key={player.user_id} style={styles.playerRow}>
              <View style={styles.playerAvatar}>
                <Text style={styles.playerInitial}>
                  {player.username.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.playerName}>{player.username}</Text>
              {player.user_id === session.created_by && (
                <View style={styles.hostTag}>
                  <Text style={styles.hostTagText}>Host</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {session.description && (
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{session.description}</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom action */}
      <View style={styles.bottomBar}>
        {session.is_ended && hasJoined && !session.has_rated && !session.is_finalized ? (
          <TouchableOpacity
            style={styles.joinButton}
            onPress={() => router.push(`/session/rate/${id}` as any)}
          >
            <Text style={styles.joinButtonText}>Rate Players</Text>
          </TouchableOpacity>
        ) : session.is_ended && hasJoined && session.has_rated && !session.is_finalized ? (
          <View style={styles.statusBadge}>
            <MaterialIcons name="check-circle-outline" size={r(18)} color="#64748B" />
            <Text style={styles.statusBadgeText}>Ratings Submitted</Text>
          </View>
        ) : session.is_ended && session.is_finalized ? (
          <View style={styles.statusBadge}>
            <MaterialIcons name="verified" size={r(18)} color="#0B36F4" />
            <Text style={[styles.statusBadgeText, { color: "#0B36F4" }]}>Session Completed</Text>
          </View>
        ) : session.is_ended ? (
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>Session Ended</Text>
          </View>
        ) : isCreator ? (
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Cancel Session</Text>
          </TouchableOpacity>
        ) : hasJoined ? (
          <TouchableOpacity style={styles.leaveButton} onPress={handleLeave}>
            <Text style={styles.leaveButtonText}>Leave Session</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.joinButton, isFull && styles.joinButtonDisabled]}
            onPress={handleJoin}
            disabled={isFull}
          >
            <Text style={[styles.joinButtonText, isFull && styles.joinButtonTextDisabled]}>
              {isFull ? "Session Full" : "Join Session"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
    gap: r(12),
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
  scrollContent: {
    padding: r(20),
    paddingBottom: r(120),
  },
  titleSection: {
    marginBottom: r(20),
  },
  sessionName: {
    fontSize: r(22),
    fontFamily: "Lexend_700Bold",
    color: "#0F172A",
    marginBottom: r(10),
  },
  badgeRow: {
    flexDirection: "row",
    gap: r(8),
  },
  sportBadge: {
    backgroundColor: "#E6EAFD",
    paddingHorizontal: r(12),
    paddingVertical: r(4),
    borderRadius: r(12),
  },
  sportText: {
    fontSize: r(12),
    fontFamily: "Lexend_600SemiBold",
    color: "#0B36F4",
    textTransform: "capitalize",
  },
  skillBadge: {
    backgroundColor: "#F0FDF4",
    paddingHorizontal: r(12),
    paddingVertical: r(4),
    borderRadius: r(12),
  },
  skillText: {
    fontSize: r(12),
    fontFamily: "Lexend_600SemiBold",
    color: "#16A34A",
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: r(16),
    padding: r(16),
    marginBottom: r(20),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: r(12),
    paddingVertical: r(8),
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: r(11),
    fontFamily: "Lexend_500Medium",
    color: "#94A3B8",
    marginBottom: r(2),
  },
  infoValue: {
    fontSize: r(15),
    fontFamily: "Lexend_600SemiBold",
    color: "#0F172A",
  },
  infoSubtext: {
    fontSize: r(13),
    fontFamily: "Lexend_400Regular",
    color: "#64748B",
    marginTop: r(2),
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: r(4),
  },
  playersSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: r(16),
    padding: r(16),
    marginBottom: r(20),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  playersSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: r(12),
  },
  sectionTitle: {
    fontSize: r(16),
    fontFamily: "Lexend_700Bold",
    color: "#0F172A",
  },
  playerCount: {
    fontSize: r(14),
    fontFamily: "Lexend_600SemiBold",
    color: "#64748B",
  },
  progressBarBg: {
    height: r(6),
    backgroundColor: "#E2E8F0",
    borderRadius: r(3),
    marginBottom: r(16),
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#0B36F4",
    borderRadius: r(3),
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: r(8),
    gap: r(12),
  },
  playerAvatar: {
    width: r(36),
    height: r(36),
    borderRadius: r(18),
    backgroundColor: "#E6EAFD",
    justifyContent: "center",
    alignItems: "center",
  },
  playerInitial: {
    fontSize: r(14),
    fontFamily: "Lexend_700Bold",
    color: "#0B36F4",
  },
  playerName: {
    fontSize: r(14),
    fontFamily: "Lexend_500Medium",
    color: "#0F172A",
    flex: 1,
  },
  hostTag: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: r(8),
    paddingVertical: r(2),
    borderRadius: r(8),
  },
  hostTagText: {
    fontSize: r(10),
    fontFamily: "Lexend_600SemiBold",
    color: "#D97706",
  },
  descriptionSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: r(16),
    padding: r(16),
    marginBottom: r(20),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  descriptionText: {
    fontSize: r(14),
    fontFamily: "Lexend_400Regular",
    color: "#475569",
    marginTop: r(8),
    lineHeight: r(22),
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    padding: r(20),
    paddingBottom: r(36),
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  joinButton: {
    backgroundColor: "#0B36F4",
    borderRadius: r(28),
    paddingVertical: r(16),
    alignItems: "center",
  },
  joinButtonDisabled: {
    backgroundColor: "#E2E8F0",
  },
  joinButtonText: {
    fontSize: r(16),
    fontFamily: "Lexend_700Bold",
    color: "#FFFFFF",
  },
  joinButtonTextDisabled: {
    color: "#94A3B8",
  },
  leaveButton: {
    backgroundColor: "#FEF2F2",
    borderRadius: r(28),
    paddingVertical: r(16),
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  leaveButtonText: {
    fontSize: r(16),
    fontFamily: "Lexend_700Bold",
    color: "#EF4444",
  },
  cancelButton: {
    backgroundColor: "#FEF2F2",
    borderRadius: r(28),
    paddingVertical: r(16),
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  cancelButtonText: {
    fontSize: r(16),
    fontFamily: "Lexend_700Bold",
    color: "#EF4444",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: r(28),
    paddingVertical: r(16),
    gap: r(8),
  },
  statusBadgeText: {
    fontSize: r(15),
    fontFamily: "Lexend_600SemiBold",
    color: "#64748B",
  },
  emptyText: {
    fontSize: r(16),
    fontFamily: "Lexend_600SemiBold",
    color: "#64748B",
  },
  linkText: {
    fontSize: r(14),
    fontFamily: "Lexend_600SemiBold",
    color: "#0B36F4",
  },
});
