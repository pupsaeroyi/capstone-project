import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { r } from "@/utils/responsive";

export default function PaymentSuccess() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const sessionId = Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId;
  const amount = Array.isArray(params.amount) ? params.amount[0] : params.amount;

  const goToSession = () => {
    // Success was reached via router.replace on the payment screen, so the
    // stack is [session, success]. Popping once returns to the original
    // session screen (which refetches via useFocusEffect and reflects joined
    // state), keeping the back stack clean.
    if (router.canGoBack()) {
      router.back();
    } else if (sessionId) {
      router.replace(`/session/${sessionId}` as any);
    } else {
      router.replace("/tabs/home" as any);
    }
  };

  const reference = `PP${Date.now().toString().slice(-10)}`;

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Ionicons name="checkmark" size={r(48)} color="#fff" />
      </View>

      <Text style={styles.title}>Payment Successful</Text>
      <Text style={styles.subtitle}>You&apos;re in. Get ready to play.</Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Amount</Text>
          <Text style={styles.rowValue}>฿ {amount ? Number(amount).toFixed(2) : "—"}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Method</Text>
          <Text style={styles.rowValue}>PromptPay</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Reference</Text>
          <Text style={styles.rowValue}>{reference}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.button} onPress={goToSession}>
        <Text style={styles.buttonText}>Back to Session</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: r(24),
  },
  badge: {
    width: r(90),
    height: r(90),
    borderRadius: r(45),
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: r(20),
  },
  title: {
    fontFamily: "Lexend_700Bold",
    fontSize: r(22),
    color: "#0F172A",
    marginBottom: r(6),
  },
  subtitle: {
    fontFamily: "Lexend_400Regular",
    fontSize: r(14),
    color: "#64748B",
    marginBottom: r(28),
  },
  card: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderRadius: r(16),
    padding: r(18),
    marginBottom: r(28),
  },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: r(8) },
  rowLabel: { fontFamily: "Lexend_400Regular", fontSize: r(13), color: "#94A3B8" },
  rowValue: { fontFamily: "Lexend_600SemiBold", fontSize: r(14), color: "#0F172A" },
  divider: { height: 1, backgroundColor: "#E2E8F0" },
  button: {
    width: "100%",
    backgroundColor: "#0B36F4",
    paddingVertical: r(14),
    borderRadius: r(14),
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontFamily: "Lexend_700Bold", fontSize: r(15) },
});
