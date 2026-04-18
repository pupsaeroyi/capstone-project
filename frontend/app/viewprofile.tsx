import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";
import * as SecureStore from "expo-secure-store";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { r } from "@/utils/responsive";
import { openDirectChat } from "@/lib/chat";

export default function ViewProfile() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const userId = Array.isArray(params.userId) ? params.userId[0] : params.userId;

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [friendStatus, setFriendStatus] = useState<"none" | "pending" | "accepted">("none");
  const [friendDirection, setFriendDirection] = useState<"incoming" | "outgoing" | null>(null);
  const [friendBusy, setFriendBusy] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchProfile();
      fetchFriendStatus();
    }
  }, [userId]);

  const fetchProfile = async () => {
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      const res = await fetch(`${API_BASE}/profile/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        if (data.ok) setProfile(data.profile);
        else console.log("Backend error:", data.message);
      } catch {
        console.error("Invalid JSON:", text);
      }
    } catch (err) {
      console.error("Fetch profile error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFriendStatus = async () => {
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      const res = await fetch(`${API_BASE}/api/friends/status/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) {
        setFriendStatus(data.status);
        setFriendDirection(data.direction);
      }
    } catch (err) {
      console.error("Fetch friend status error:", err);
    }
  };

  const sendFriendRequest = async () => {
    if (friendBusy) return;
    setFriendBusy(true);
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      const res = await fetch(`${API_BASE}/api/friends/request`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requestedId: Number(userId) }),
      });
      const data = await res.json();
      if (data.ok) {
        setFriendStatus("pending");
        setFriendDirection("outgoing");
      }
    } catch (err) {
      console.error("Send friend request error:", err);
    } finally {
      setFriendBusy(false);
    }
  };

  const acceptFriendRequest = async () => {
    if (friendBusy) return;
    setFriendBusy(true);
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      const res = await fetch(`${API_BASE}/api/friends/accept`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requesterId: Number(userId) }),
      });
      const data = await res.json();
      if (data.ok) {
        setFriendStatus("accepted");
      }
    } catch (err) {
      console.error("Accept friend request error:", err);
    } finally {
      setFriendBusy(false);
    }
  };

  const removeFriend = async () => {
    if (friendBusy) return;
    setFriendBusy(true);
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      const res = await fetch(`${API_BASE}/api/friends/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) {
        setFriendStatus("none");
        setFriendDirection(null);
      }
    } catch (err) {
      console.error("Remove friend error:", err);
    } finally {
      setFriendBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerFull}>
        <ActivityIndicator size="large" color="#0B36F4" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.centerFull}>
        <Text style={styles.notFound}>User not found</Text>
      </View>
    );
  }

  const positions = [profile.pos1, profile.pos2, profile.pos3].filter(Boolean);
  const ALL_POSITIONS = ["Setter", "Libero", "Outside Hitter", "Middle Blocker", "Opposite Hitter"];

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={r(26)} color="#0F172A" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.title}>
          {/* Username */}
          <Text style={styles.titleText}>{profile.username}</Text>

          {/* Avatar */}
          <View style={styles.avatarCircle}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {profile.username?.[0]?.toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          {/* Rank */}
          <Text style={styles.rankLabel}>Athlete Rank</Text>
          <Text style={styles.rankValue}>{profile.rank || "Unranked"}</Text>

          {/* Friend action */}
          <View style={styles.friendActionWrap}>
            {friendStatus === "none" && (
              <TouchableOpacity
                style={[styles.friendBtnPrimary, friendBusy && styles.friendBtnDisabled]}
                onPress={sendFriendRequest}
                disabled={friendBusy}
              >
                <MaterialIcons name="person-add-alt-1" size={r(20)} color="#fff" />
                <Text style={styles.friendBtnPrimaryText}>Add Friend</Text>
              </TouchableOpacity>
            )}

            {friendStatus === "pending" && friendDirection === "outgoing" && (
              <TouchableOpacity
                style={[styles.friendBtnSecondary, friendBusy && styles.friendBtnDisabled]}
                onPress={removeFriend}
                disabled={friendBusy}
              >
                <Ionicons name="time-outline" size={r(16)} color="#64748B" />
                <Text style={styles.friendBtnSecondaryText}>Request Sent · Cancel</Text>
              </TouchableOpacity>
            )}

            {friendStatus === "pending" && friendDirection === "incoming" && (
              <View style={styles.friendBtnRow}>
                <TouchableOpacity
                  style={[styles.friendBtnInline, styles.friendBtnAccept, friendBusy && styles.friendBtnDisabled]}
                  onPress={acceptFriendRequest}
                  disabled={friendBusy}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark" size={r(16)} color="#fff" />
                  <Text style={styles.friendBtnAcceptText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.friendBtnInline, styles.friendBtnDecline, friendBusy && styles.friendBtnDisabled]}
                  onPress={removeFriend}
                  disabled={friendBusy}
                  activeOpacity={0.85}
                >
                  <Ionicons name="close" size={r(16)} color="#EF4444" />
                  <Text style={styles.friendBtnDeclineText}>Decline</Text>
                </TouchableOpacity>
              </View>
            )}

            {friendStatus === "accepted" && (
              <View style={styles.friendBtnRow}>
                <TouchableOpacity
                  style={[styles.friendBtnInline, styles.friendBtnAccept, friendBusy && styles.friendBtnDisabled]}
                  onPress={async () => {
                    try {
                      await openDirectChat(Number(userId), router);
                    } catch (err) {
                      console.error("Open chat error:", err);
                    }
                  }}
                  disabled={friendBusy}
                  activeOpacity={0.85}
                >
                  <Ionicons name="chatbubble-ellipses" size={r(16)} color="#fff" />
                  <Text style={styles.friendBtnAcceptText}>Message</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.friendBtnInline, styles.friendBtnFriends, friendBusy && styles.friendBtnDisabled]}
                  onPress={removeFriend}
                  disabled={friendBusy}
                  activeOpacity={0.85}
                >
                  <Ionicons name="people" size={r(16)} color="#0B36F4" />
                  <Text style={styles.friendBtnFriendsText}>Friends</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Matches</Text>
              <Text style={styles.statValue}>{profile.matches_played ?? 0}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>ELO</Text>
              <Text style={styles.statValue}>{profile.rating_score ?? 0}</Text>
            </View>
          </View>

          {/* Info Section */}
          <View style={styles.infoSection}>
            <Text style={styles.fieldLabel}>Age</Text>
            <View style={styles.fieldCard}>
              <Text style={styles.fieldText}>{profile.age ?? "Not set"}</Text>
            </View>

            <Text style={styles.fieldLabel}>MBTI Type</Text>
            <View style={styles.fieldCard}>
              <Text style={styles.fieldText}>{profile.mbti_type ?? "Not set"}</Text>
            </View>

            <Text style={styles.fieldLabel}>Preferred Positions</Text>
            <View style={styles.positionsContainer}>
              {ALL_POSITIONS.map((pos) => {
                const isActive = positions.includes(pos);
                return (
                  <View
                    key={pos}
                    style={[styles.positionBadge, isActive ? styles.activeBadge : styles.inactiveBadge]}
                  >
                    <Text style={[styles.positionText, isActive ? styles.activeText : styles.inactiveText]}>
                      {pos}
                    </Text>
                    {isActive && <Ionicons name="checkmark-circle" size={16} color="#fff" />}
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  centerFull: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },

  notFound: {
    fontSize: 16,
    color: "#64748B",
    fontFamily: "Lexend_400Regular",
  },

  header: {
    width: "100%",
    backgroundColor: "#fff",
    paddingTop: r(50),
    paddingHorizontal: r(20),
    paddingBottom: r(8),
  },

  backBtn: {
    padding: r(4),
    alignSelf: "flex-start",
  },

  container: {
    backgroundColor: "#fff",
    paddingHorizontal: "10%",
  },

  content: {
    flexGrow: 1,
    paddingBottom: r(120),
  },

  title: {
    alignItems: "center",
  },

  titleText: {
    fontFamily: "Lexend_700Bold",
    fontSize: r(20),
    color: "#0F172A",
    marginBottom: r(18),
  },

  avatarCircle: {
    width: r(90),
    height: r(90),
    borderRadius: r(45),
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: r(18),
    overflow: "hidden",
  },

  avatarImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: r(45),
    backgroundColor: "#0B36F4",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarInitial: {
    fontSize: r(36),
    fontFamily: "Lexend_700Bold",
    color: "#fff",
  },

  rankLabel: {
    fontFamily: "Lexend_500Medium",
    fontSize: r(16),
    color: "#94A3B8",
  },

  rankValue: {
    fontFamily: "Lexend_700Bold",
    fontSize: r(20),
    color: "#0F172A",
    marginTop: r(8),
  },

  friendActionWrap: {
    width: "100%",
    marginTop: r(18),
    alignItems: "center",
  },

  friendBtnRow: {
    flexDirection: "row",
    gap: r(10),
    width: "100%",
  },

  friendBtnInline: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: r(6),
    paddingVertical: r(12),
    paddingHorizontal: r(10),
    borderRadius: 32,
    minWidth: 0,
  },

  friendBtnAccept: {
    backgroundColor: "#0B36F4",
  },

  friendBtnAcceptText: {
    color: "#fff",
    fontFamily: "Lexend_600SemiBold",
    fontSize: r(14),
  },

  friendBtnDecline: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },

  friendBtnDeclineText: {
    color: "#EF4444",
    fontFamily: "Lexend_600SemiBold",
    fontSize: r(14),
  },

  friendBtnFriends: {
    backgroundColor: "#E0E7FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },

  friendBtnFriendsText: {
    color: "#0B36F4",
    fontFamily: "Lexend_600SemiBold",
    fontSize: r(14),
  },

  friendBtnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: r(8),
    backgroundColor: "#0B36F4",
    paddingVertical: r(12),
    paddingHorizontal: r(24),
    borderRadius: 32,
  },

  friendBtnPrimaryText: {
    color: "#fff",
    fontFamily: "Lexend_600SemiBold",
    fontSize: r(14),
  },

  friendBtnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: r(8),
    backgroundColor: "#F1F5F9",
    paddingVertical: r(12),
    paddingHorizontal: r(22),
    borderRadius: 32,
    minWidth: r(180),
  },

  friendBtnSecondaryText: {
    color: "#64748B",
    fontFamily: "Lexend_600SemiBold",
    fontSize: r(14),
  },

  friendBtnDisabled: {
    opacity: 0.6,
  },

  	statsRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		width: "100%",
		marginTop: r(18),
		marginBottom: r(18),
		gap: 20,
		paddingHorizontal: r(32),
	},

	statCard: {
		flex: 1,
		backgroundColor: "#F8FAFC", 
		paddingVertical: 18,
    paddingHorizontal: 18,
		borderRadius: 16,
		alignItems: "center",
		borderWidth: 1,
		borderColor: "#E7EBFE",
	},
  
  statLabel: {
    fontFamily: "Lexend_600SemiBold",
    fontSize: r(14),
    color: "#0B36F4",
    marginBottom: r(4),
  },

  statValue: {
    fontFamily: "Lexend_700Bold",
    fontSize: r(20),
    color: "#0B36F4",
  },

  infoSection: {
    width: "100%",
    gap: r(12),
  },

  fieldLabel: {
    fontFamily: "Lexend_600SemiBold",
    fontSize: r(14),
    color: "#64748B",
  },

  fieldCard: {
    backgroundColor: "#F8FAFC",
    paddingVertical: r(12),
    paddingHorizontal: r(20),
    borderRadius: 28,
    borderColor: "#E7EBFE",
    borderWidth: 1,
  },

  fieldText: {
    fontFamily: "Lexend_700Bold",
    fontSize: r(15),
    color: "#0F172A",
  },

  positionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: r(8),
    marginTop: r(4),
  },

  positionBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: r(8),
    paddingHorizontal: r(14),
    borderRadius: r(24),
    gap: r(6),
  },

  activeBadge: {
    backgroundColor: "#0B36F4",
  },

  inactiveBadge: {
    backgroundColor: "#F1F5F9",
  },

  positionText: {
    fontFamily: "Lexend_600SemiBold",
    fontSize: r(13),
  },

  activeText: {
    color: "#FFFFFF",
  },

  inactiveText: {
    color: "#64748B",
  },
});