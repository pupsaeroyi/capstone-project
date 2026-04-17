import { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image } from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { r } from "@/utils/responsive";
import { API_BASE, authFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { openDirectChat } from "@/lib/chat";

type Player = {
  user_id: number;
  username: string;
  avatar_url?: string;
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
  venue_thumbnail: string | null;
  venue_is_free: boolean;
  booking_fee: number;
  player_count: number;
  players: Player[];
  is_ended: boolean;
  has_rated: boolean;
  is_finalized: boolean;
  session_type: string;
  mbti_matching: boolean;
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

  useFocusEffect(
    useCallback(() => {
      fetchSession();
    }, [fetchSession])
  );

  const isCreator = user?.id === session?.created_by;
  const hasJoined = session ? session.players.some(p => p.user_id === user?.id) : false;
  const isFull = session ? session.player_count >= session.max_players : false;
  const slotsLeft = session ? session.max_players - session.player_count : 0;

  const handleJoin = async () => {
    // Free sessions skip the payment flow entirely
    if (!session?.booking_fee) {
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
      return;
    }
    router.push(`/payment/${id}` as any);
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

  const formatDateShort = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { weekday: "short", month: "short", day: "2-digit" });
  };

  const skillLabel = (level: string) => {
    const map: Record<string, string> = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced", pro: "Pro", all: "All Levels" };
    return map[level] || level;
  };

  const skillColor = (level: string) => {
    const map: Record<string, string> = { beginner: "#16A34A", intermediate: "#0B36F4", advanced: "#D97706", pro: "#DC2626", all: "#64748B" };
    return map[level] || "#64748B";
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
      <ScrollView contentContainerStyle={{ paddingBottom: r(120) }} showsVerticalScrollIndicator={false}>
        {/* Hero Image */}
        <View style={styles.hero}>
          <Image
            source={
              session.venue_thumbnail
                ? { uri: session.venue_thumbnail }
                : require("@/assets/images/default-court.jpg")
            }
            style={styles.heroImage}
          />
          <View style={styles.heroOverlay} />
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle} numberOfLines={2}>
              {session.session_name || `${session.sport} Session`}
            </Text>
            <View style={styles.heroLocation}>
              <MaterialIcons name="location-on" size={r(14)} color="#FFF" />
              <Text style={styles.heroLocationText} numberOfLines={1}>{session.venue_name}</Text>
            </View>
          </View>
        </View>

        {/* Badges */}
        <View style={styles.badgeRow}>
          <View style={[styles.heroBadge, { backgroundColor: skillColor(session.skill_level) }]}>
            <Text style={styles.heroBadgeText}>{skillLabel(session.skill_level)}</Text>
          </View>
          <View style={[styles.heroBadge, { backgroundColor: session.session_type === "ranked" ? "#F59E0B" : "#94A3B8" }]}>
            <Text style={styles.heroBadgeText}>{session.session_type === "ranked" ? "Ranked" : "Casual"}</Text>
          </View>
          {session.mbti_matching && (
            <View style={[styles.heroBadge, { backgroundColor: "#8B5CF6" }]}>
              <Text style={styles.heroBadgeText}>MBTI</Text>
            </View>
          )}
        </View>

        {/* Date & Time Pills */}
        <View style={styles.dateTimeRow}>
          <View style={styles.dateTimePill}>
            <MaterialIcons name="calendar-today" size={r(16)} color="#0B36F4" />
            <View>
              <Text style={styles.dtLabel}>Date</Text>
              <Text style={styles.dtValue}>{formatDateShort(session.start_time)}</Text>
            </View>
          </View>
          <View style={styles.dateTimePill}>
            <MaterialIcons name="schedule" size={r(16)} color="#0B36F4" />
            <View>
              <Text style={styles.dtLabel}>Time</Text>
              <Text style={styles.dtValue}>{formatTime(session.start_time)} - {formatTime(session.end_time)}</Text>
            </View>
          </View>
        </View>

        {/* Host */}
        <View style={styles.section}>
          <View style={styles.hostRow}>
            <View style={styles.hostAvatar}>
              <Text style={styles.hostInitial}>{session.host_username.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.hostLabel}>Host</Text>
              <Text style={styles.hostName}>{session.host_username}</Text>
            </View>
            {!isCreator && (
              <TouchableOpacity
                style={styles.messageBtn}
                onPress={async () => {
                  try {
                    await openDirectChat(session.created_by, router);
                  } catch (err) {
                    console.error("Open chat error:", err);
                    Alert.alert("Error", "Could not open chat");
                  }
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.messageBtnText}>Message</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Requirements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Requirements</Text>
          <View style={[styles.reqPill, { borderLeftColor: skillColor(session.skill_level) }]}>
            <MaterialIcons name="fitness-center" size={r(18)} color="#94A3B8" />
            <Text style={styles.reqLabel}>Skill Level</Text>
            <View style={[styles.countPill, { backgroundColor: skillColor(session.skill_level) + "20", marginLeft: "auto" }]}>
              <Text style={[styles.countPillText, { color: skillColor(session.skill_level) }]}>
                {skillLabel(session.skill_level)}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Current Roster */}
        <View style={styles.section}>
          <View style={styles.rosterHeader}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Current Roster</Text>
            <View style={styles.countPill}>
              <Text style={styles.rosterCount}>{session.player_count} / {session.max_players} Joined</Text>
            </View>
          </View>
          <View style={styles.rosterRow}>
            {session.players.map((player) => (
              <View key={player.user_id} style={styles.rosterPlayer}>
                  <View style={styles.rosterAvatar}>
                    {player.avatar_url ? (
                      <Image
                        source={{ uri: player.avatar_url }}
                        style={{ width: "100%", height: "100%" }}
                      />
                    ) : (
                      <Text style={styles.rosterInitial}>
                        {player.username.charAt(0).toUpperCase()}
                      </Text>
                    )}
                  </View>
                <Text style={styles.rosterName} numberOfLines={1}>{player.username.split(" ")[0]}</Text>
              </View>
            ))}
            {slotsLeft > 0 && (
              <View style={styles.rosterPlayer}>
                <View style={styles.rosterOpen}>
                  <Ionicons name="add" size={r(20)} color="#94A3B8" />
                </View>
                <Text style={styles.rosterName}>Open</Text>
              </View>
            )}
          </View>
        </View>

        {/* About the Session */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About the Session</Text>
          <Text style={styles.aboutText}>
            {session.description || "Join us for a fun volleyball session! All skill levels are welcome. Please arrive 10 minutes early for warm-ups."}
          </Text>
        </View>

        {/* Court Rules */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Court Rules</Text>
          <View style={styles.ruleRow}>
            <Text style={styles.ruleBullet}>•</Text>
            <Text style={styles.ruleText}>No outdoor shoes on the court.</Text>
          </View>
          <View style={styles.ruleRow}>
            <Text style={styles.ruleBullet}>•</Text>
            <Text style={styles.ruleText}>Cancellations must be made 24h prior.</Text>
          </View>
          <View style={styles.ruleRow}>
            <Text style={styles.ruleBullet}>•</Text>
            <Text style={styles.ruleText}>Fair play and positive communication only.</Text>
          </View>
        </View>

        {/* Booking Fee + Remaining */}
        <View style={styles.feeRow}>
          <View>
            <Text style={styles.feeLabel}>Booking Fee</Text>
            {session.booking_fee > 0 ? (
              <View style={styles.feeValue}>
                <Text style={styles.feeAmount}>฿{session.booking_fee}</Text>
                <Text style={styles.feePer}>/ person</Text>
              </View>
            ) : (
              <Text style={[styles.feeAmount, { color: "#10B981" }]}>Free</Text>
            )}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.feeLabel}>Remaining</Text>
            <Text style={styles.remainValue}>{slotsLeft} Spots</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action */}
      <View style={styles.bottomBar}>
        {session.is_ended && hasJoined && !session.has_rated && !session.is_finalized ? (
          <TouchableOpacity style={styles.joinButton} onPress={() => router.push(`/session/rate/${id}` as any)}>
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
              {isFull ? "Session Full" : "Join Session →"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  centered: { justifyContent: "center", alignItems: "center", gap: r(12) },
  emptyText: { fontSize: r(16), fontFamily: "Lexend_600SemiBold", color: "#64748B" },
  linkText: { fontSize: r(14), fontFamily: "Lexend_600SemiBold", color: "#0B36F4" },

  // Hero
  hero: { height: r(220), position: "relative" },
  heroImage: { width: "100%", height: "100%", resizeMode: "cover" },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)" },
  backBtn: {
    position: "absolute", top: r(50), left: r(16),
    width: r(36), height: r(36), borderRadius: r(18),
    backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center", alignItems: "center",
  },
  badgeRow: {
    flexDirection: "row", gap: r(6), paddingHorizontal: r(20), marginTop: r(14),
  },
  heroBadge: {
    paddingHorizontal: r(10), paddingVertical: r(4), borderRadius: r(8),
  },
  heroBadgeText: { fontSize: r(11), fontFamily: "Lexend_700Bold", color: "#FFF" },
  heroContent: { position: "absolute", bottom: r(16), left: r(16), right: r(16) },
  heroTitle: { fontSize: r(22), fontFamily: "Lexend_700Bold", color: "#FFF", marginBottom: r(4) },
  heroLocation: { flexDirection: "row", alignItems: "center", gap: r(4) },
  heroLocationText: { fontSize: r(13), fontFamily: "Lexend_400Regular", color: "#FFF" },

  // Date & Time
  dateTimeRow: {
    flexDirection: "row", gap: r(12), paddingHorizontal: r(20), marginTop: r(16),
  },
  dateTimePill: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: r(10),
    backgroundColor: "#FFF", borderRadius: r(16), padding: r(14),
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  dtLabel: { fontSize: r(11), fontFamily: "Lexend_400Regular", color: "#94A3B8" },
  dtValue: { fontSize: r(13), fontFamily: "Lexend_600SemiBold", color: "#0F172A" },

  // Sections
  section: {
    backgroundColor: "#FFF", marginHorizontal: r(20), marginTop: r(16),
    borderRadius: r(16), padding: r(16),
  },
  sectionTitle: { fontSize: r(15), fontFamily: "Lexend_700Bold", color: "#0F172A", marginBottom: r(12) },

  // Host
  hostRow: { flexDirection: "row", alignItems: "center", gap: r(12) },
  hostAvatar: {
    width: r(44), height: r(44), borderRadius: r(22),
    backgroundColor: "#0B36F4", justifyContent: "center", alignItems: "center",
  },
  hostInitial: { fontSize: r(18), fontFamily: "Lexend_700Bold", color: "#FFF" },
  hostLabel: { fontSize: r(11), fontFamily: "Lexend_400Regular", color: "#94A3B8" },
  hostName: { fontSize: r(15), fontFamily: "Lexend_700Bold", color: "#0F172A" },
  messageBtn: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#E7EBFE", paddingHorizontal: r(14), paddingVertical: r(8), borderRadius: r(28),
  },
  messageBtnText: { fontSize: r(13), fontFamily: "Lexend_700Bold", color: "#0B36F4" },

  // Requirements
  reqRow: { flexDirection: "row", alignItems: "center", gap: r(10) },
  reqLabel: { fontSize: r(14), fontFamily: "Lexend_500Medium", color: "#0F172A", flex: 1 },
  reqValue: { fontSize: r(14), fontFamily: "Lexend_700Bold", color: "#0F172A" },

  // Roster
  rosterHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: r(12) },
  rosterRow: { flexDirection: "row", flexWrap: "wrap", gap: r(12) },
  rosterPlayer: { alignItems: "center", width: r(56) },
  rosterAvatar: {
    width: r(44), height: r(44), borderRadius: r(22),
    backgroundColor: "#0B36F4", justifyContent: "center", alignItems: "center", overflow: "hidden",  
  },
  rosterInitial: { fontSize: r(16), fontFamily: "Lexend_700Bold", color: "#FFF" },
  rosterName: { fontSize: r(11), fontFamily: "Lexend_500Medium", color: "#64748B", marginTop: r(4) },
  rosterOpen: {
    width: r(44), height: r(44), borderRadius: r(22),
    borderWidth: 2, borderColor: "#E2E8F0", borderStyle: "dashed",
    justifyContent: "center", alignItems: "center",
  },
    rosterCount: {
    fontSize: r(12),
    fontFamily: "Lexend_600SemiBold",
    color: "#0B36F4",
  },

  // About
  aboutText: { fontSize: r(13), fontFamily: "Lexend_400Regular", color: "#475569", lineHeight: r(20) },

  // Rules
  ruleRow: { flexDirection: "row", gap: r(8), marginBottom: r(6) },
  ruleBullet: { fontSize: r(14), color: "#F59E0B", fontFamily: "Lexend_700Bold" },
  ruleText: { fontSize: r(13), fontFamily: "Lexend_400Regular", color: "#475569", flex: 1 },

  // Fee
  feeRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end",
    marginHorizontal: r(20), marginTop: r(16), paddingBottom: r(8),
  },
  feeLabel: { fontSize: r(11), fontFamily: "Lexend_400Regular", color: "#64748B", marginBottom: r(2) },
  feeValue: { flexDirection: "row", alignItems: "baseline" },
  feeAmount: { fontSize: r(28), fontFamily: "Lexend_700Bold", color: "#0B36F4" },
  feePer: { fontSize: r(13), fontFamily: "Lexend_400Regular", color: "#94A3B8" },
  remainValue: { fontSize: r(16), fontFamily: "Lexend_700Bold", color: "#0B36F4" },

  // Bottom bar
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#FFF", padding: r(20), paddingBottom: r(36),
    borderTopWidth: 1, borderTopColor: "#E2E8F0",
  },
  joinButton: {
    backgroundColor: "#0B36F4", borderRadius: r(28), paddingVertical: r(16), alignItems: "center",
  },
  joinButtonDisabled: { backgroundColor: "#E2E8F0" },
  joinButtonText: { fontSize: r(16), fontFamily: "Lexend_700Bold", color: "#FFF" },
  joinButtonTextDisabled: { color: "#94A3B8" },
  leaveButton: {
    backgroundColor: "#FEF2F2", borderRadius: r(28), paddingVertical: r(16),
    alignItems: "center", borderWidth: 1, borderColor: "#FECACA",
  },
  leaveButtonText: { fontSize: r(16), fontFamily: "Lexend_700Bold", color: "#EF4444" },
  cancelButton: {
    backgroundColor: "#FEF2F2", borderRadius: r(28), paddingVertical: r(16),
    alignItems: "center", borderWidth: 1, borderColor: "#FECACA",
  },
  cancelButtonText: { fontSize: r(16), fontFamily: "Lexend_700Bold", color: "#EF4444" },
  statusBadge: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#F1F5F9", borderRadius: r(28), paddingVertical: r(16), gap: r(8),
  },
  statusBadgeText: { fontSize: r(15), fontFamily: "Lexend_600SemiBold", color: "#64748B" },

  countPill: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: r(10),
    paddingVertical: r(4),
    borderRadius: r(20),
  },

  countPillText: {
    fontSize: r(12),
    fontFamily: "Lexend_600SemiBold",
    color: "#0B36F4",
  },
  reqPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: r(10),
    backgroundColor: "#F8FAFC",
    borderRadius: r(16),
    padding: r(14),
  },
});
