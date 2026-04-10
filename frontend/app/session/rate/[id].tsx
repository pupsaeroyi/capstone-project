import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { authFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { r } from "@/utils/responsive";

type CoPlayer = {
  user_id: number;
  username: string;
  avatar_url: string | null;
};

type RatingStatus = {
  is_ended: boolean;
  has_rated: boolean;
  is_finalized: boolean;
  rating_deadline: string;
  players: CoPlayer[];
};

export default function RatePlayersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const [status, setStatus] = useState<RatingStatus | null>(null);
  const [scores, setScores] = useState<Record<number, number>>({});
  const [selfScore, setSelfScore] = useState<number>(5);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await authFetch(`/sessions/${id}/rating-status`);
        if (data.ok) {
          setStatus(data);
          const initial: Record<number, number> = {};
          data.players.forEach((p: CoPlayer) => {
            initial[p.user_id] = 5;
          });
          setScores(initial);
        } else {
          Alert.alert("Error", data.message || "Could not load rating info");
        }
      } catch (err) {
        Alert.alert("Error", "Failed to connect");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const adjustScore = (userId: number, delta: number) => {
    setScores((prev) => {
      const current = prev[userId] ?? 5;
      const next = Math.max(0, Math.min(10, current + delta));
      return { ...prev, [userId]: next };
    });
  };

  const adjustSelf = (delta: number) => {
    setSelfScore((prev) => Math.max(0, Math.min(10, prev + delta)));
  };

  const handleSubmit = async () => {
    if (!status) return;
    setSubmitting(true);

    try {
      const ratings = status.players.map((p) => ({
        user_id: p.user_id,
        score: scores[p.user_id] ?? 5,
      }));

      const data = await authFetch(`/sessions/${id}/rate`, {
        method: "POST",
        body: JSON.stringify({ ratings, self_score: selfScore }),
      });

      if (data.ok) {
        await refreshProfile();
        if (data.finalized && data.my_update) {
          const u = data.my_update;
          const msg = u.rankChanged
            ? `Your rank changed: ${u.oldRank} → ${u.newRank}!\nScore: ${u.oldScore} → ${u.newScore} (${u.delta > 0 ? "+" : ""}${u.delta})`
            : `Score updated: ${u.oldScore} → ${u.newScore} (${u.delta > 0 ? "+" : ""}${u.delta})`;
          Alert.alert("Ratings Finalized", msg, [
            { text: "OK", onPress: () => router.back() },
          ]);
        } else {
          Alert.alert("Submitted", "Your ratings have been recorded. Waiting for other players.", [
            { text: "OK", onPress: () => router.back() },
          ]);
        }
      } else {
        Alert.alert("Error", data.message || "Failed to submit ratings");
      }
    } catch (err) {
      Alert.alert("Error", "Failed to connect");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#0B36F4" />
      </View>
    );
  }

  if (!status) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorText}>Could not load session info</Text>
      </View>
    );
  }

  if (status.has_rated) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ headerShown: false }} />
        <MaterialIcons name="check-circle" size={r(56)} color="#10B981" />
        <Text style={styles.doneTitle}>Already Rated</Text>
        <Text style={styles.doneSubtitle}>You have already submitted your ratings for this session.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (status.is_finalized) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ headerShown: false }} />
        <MaterialIcons name="verified" size={r(56)} color="#0B36F4" />
        <Text style={styles.doneTitle}>Session Completed</Text>
        <Text style={styles.doneSubtitle}>Ratings have been finalized for this session.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backArrow}>
          <Ionicons name="chevron-back" size={r(24)} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rate Players</Text>
        <View style={{ width: r(24) }} />
      </View>

      <Text style={styles.subtitle}>
        Rate each player's performance (0 = poor, 5 = average, 10 = excellent)
      </Text>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Co-players */}
        {status.players.map((player) => (
          <View key={player.user_id} style={styles.playerCard}>
            <View style={styles.playerInfo}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitial}>
                  {player.username[0]?.toUpperCase() ?? "?"}
                </Text>
              </View>
              <Text style={styles.playerName}>{player.username}</Text>
            </View>

            <View style={styles.scoreControl}>
              <TouchableOpacity
                style={styles.stepButton}
                onPress={() => adjustScore(player.user_id, -1)}
              >
                <MaterialIcons name="remove" size={r(20)} color="#64748B" />
              </TouchableOpacity>

              <View style={styles.scoreDisplay}>
                <Text style={styles.scoreText}>{scores[player.user_id] ?? 5}</Text>
              </View>

              <TouchableOpacity
                style={styles.stepButton}
                onPress={() => adjustScore(player.user_id, 1)}
              >
                <MaterialIcons name="add" size={r(20)} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Self evaluation */}
        <View style={styles.selfSection}>
          <Text style={styles.selfLabel}>Self Evaluation</Text>
          <View style={styles.playerCard}>
            <View style={styles.playerInfo}>
              <View style={[styles.avatarCircle, { backgroundColor: "#0B36F4" }]}>
                <Text style={styles.avatarInitial}>
                  {user?.username?.[0]?.toUpperCase() ?? "?"}
                </Text>
              </View>
              <Text style={styles.playerName}>You</Text>
            </View>

            <View style={styles.scoreControl}>
              <TouchableOpacity style={styles.stepButton} onPress={() => adjustSelf(-1)}>
                <MaterialIcons name="remove" size={r(20)} color="#64748B" />
              </TouchableOpacity>
              <View style={styles.scoreDisplay}>
                <Text style={styles.scoreText}>{selfScore}</Text>
              </View>
              <TouchableOpacity style={styles.stepButton} onPress={() => adjustSelf(1)}>
                <MaterialIcons name="add" size={r(20)} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Submit */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          <Text style={styles.submitText}>
            {submitting ? "Submitting..." : "Submit Ratings"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingTop: r(50),
  },
  centered: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    padding: r(32),
    gap: r(12),
  },
  errorText: {
    fontSize: r(14),
    fontFamily: "Lexend_400Regular",
    color: "#64748B",
  },
  doneTitle: {
    fontSize: r(20),
    fontFamily: "Lexend_700Bold",
    color: "#0F172A",
    marginTop: r(8),
  },
  doneSubtitle: {
    fontSize: r(14),
    fontFamily: "Lexend_400Regular",
    color: "#64748B",
    textAlign: "center",
  },
  backButton: {
    marginTop: r(16),
    paddingHorizontal: r(24),
    paddingVertical: r(10),
    backgroundColor: "#F1F5F9",
    borderRadius: r(12),
  },
  backButtonText: {
    fontSize: r(14),
    fontFamily: "Lexend_600SemiBold",
    color: "#0F172A",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: r(16),
    paddingBottom: r(8),
  },
  backArrow: {
    padding: r(4),
  },
  headerTitle: {
    fontSize: r(18),
    fontFamily: "Lexend_700Bold",
    color: "#0F172A",
  },
  subtitle: {
    fontSize: r(13),
    fontFamily: "Lexend_400Regular",
    color: "#64748B",
    paddingHorizontal: r(20),
    marginBottom: r(12),
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: r(20),
    paddingBottom: r(120),
  },

  // Player card
  playerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: r(16),
    padding: r(14),
    marginBottom: r(10),
  },
  playerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: r(10),
    flex: 1,
  },
  avatarCircle: {
    width: r(40),
    height: r(40),
    borderRadius: r(20),
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: r(16),
    fontFamily: "Lexend_700Bold",
    color: "#FFFFFF",
  },
  playerName: {
    fontSize: r(15),
    fontFamily: "Lexend_600SemiBold",
    color: "#0F172A",
  },

  // Score control (stepper)
  scoreControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: r(4),
  },
  stepButton: {
    width: r(34),
    height: r(34),
    borderRadius: r(17),
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  scoreDisplay: {
    width: r(40),
    alignItems: "center",
  },
  scoreText: {
    fontSize: r(18),
    fontFamily: "Lexend_700Bold",
    color: "#0B36F4",
  },

  // Self section
  selfSection: {
    marginTop: r(16),
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: r(16),
  },
  selfLabel: {
    fontSize: r(13),
    fontFamily: "Lexend_600SemiBold",
    color: "#94A3B8",
    marginBottom: r(8),
  },

  // Bottom bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: r(16),
    paddingBottom: r(32),
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  submitButton: {
    backgroundColor: "#0B36F4",
    borderRadius: r(14),
    paddingVertical: r(16),
    alignItems: "center",
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: r(16),
    fontFamily: "Lexend_700Bold",
  },
});
