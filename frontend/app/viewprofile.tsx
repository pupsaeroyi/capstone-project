import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";
import * as SecureStore from "expo-secure-store";

export default function ViewProfile() {
  const params = useLocalSearchParams();

  const userId = Array.isArray(params.userId)
    ? params.userId[0]
    : params.userId;

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      const token = await SecureStore.getItemAsync("accessToken");

      const res = await fetch(`${API_BASE}/profile/user/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const text = await res.text();

      try {
        const data = JSON.parse(text);
        if (data.ok) {
          setProfile(data.profile);
        } else {
          console.log("Backend error:", data.message);
        }
      } catch {
        console.error("Invalid JSON:", text);
      }
    } catch (err) {
      console.error("Fetch profile error:", err);
    } finally {
      setLoading(false);
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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.wrapper}>
        {/* Avatar */}
        {profile.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.initial}>
              {profile.username?.[0]?.toUpperCase()}
            </Text>
          </View>
        )}

        {/* Username */}
        <Text style={styles.username}>{profile.username}</Text>

        {/* Rank */}
        <Text style={styles.rank}>{profile.rank || "Unranked"}</Text>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <Stat label="Matches" value={profile.matches_played} />
          <Stat label="Wins" value={profile.wins} />
          <Stat label="ELO" value={profile.rating_score} />
        </View>

        {/* Positions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferred Positions</Text>
          <Text style={styles.sectionText}>
            {[profile.pos1, profile.pos2, profile.pos3]
              .filter(Boolean)
              .join(", ") || "Not set"}
          </Text>
        </View>

        {/* Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Info</Text>
          <Text style={styles.sectionText}>
            Age: {profile.age ?? "Not set"}
          </Text>
          <Text style={styles.sectionText}>
            MBTI: {profile.mbti_type ?? "Not set"}
          </Text>
          <Text style={styles.sectionText}>
            Sex: {profile.sex ?? "Not set"}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

// 🔹 Small reusable stat component
function Stat({ label, value }: { label: string; value: any }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value ?? 0}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },

  wrapper: {
    alignItems: "center",
    paddingTop: 50,
    paddingBottom: 40,
    paddingHorizontal: "6%",
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 16,
  },

  centerFull: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  notFound: {
    fontSize: 16,
    color: "#64748B",
  },

  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
  },

  avatarPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#0B36F4",
    alignItems: "center",
    justifyContent: "center",
  },

  initial: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "bold",
  },

  username: {
    fontSize: 22,
    marginTop: 12,
    fontFamily: "Lexend_600SemiBold",
    color: "#0F172A",
  },

  rank: {
    fontSize: 14,
    marginTop: 4,
    color: "#94A3B8",
  },

  statsRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 20,
  },

  statCard: {
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 18,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
  },

  statValue: {
    fontSize: 16,
    fontFamily: "Lexend_600SemiBold",
    color: "#0F172A",
  },

  statLabel: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
  },

  section: {
    marginTop: 24,
    width: "100%",
  },

  sectionTitle: {
    fontSize: 13,
    fontFamily: "Lexend_600SemiBold",
    color: "#94A3B8",
    marginBottom: 6,
  },

  sectionText: {
    fontSize: 14,
    fontFamily: "Lexend_400Regular",
    color: "#334155",
    marginBottom: 4,
  },
});