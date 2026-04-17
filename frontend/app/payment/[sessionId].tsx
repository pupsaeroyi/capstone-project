import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { authFetch } from "@/lib/api";
import { buildPromptPayPayload } from "@/lib/promptpay";
import { r } from "@/utils/responsive";

const PROMPTPAY_MERCHANT_ID = "0812345678"; // demo PromptPay account (Thai phone)
const DEFAULT_FEE = 300;

export default function PaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const sessionId = Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId;

  const [scanning, setScanning] = useState(false);
  const [qrPayload, setQrPayload] = useState<string>("");
  const [fee, setFee] = useState<number>(DEFAULT_FEE);
  const [sessionInfo, setSessionInfo] = useState<{
    session_name?: string;
    venue_name?: string;
  } | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      try {
        const data = await authFetch(`/sessions/${sessionId}`);
        if (data.ok && data.session) {
          const sessionFee = Number(data.session.booking_fee) || DEFAULT_FEE;
          setFee(sessionFee);
          setSessionInfo({
            session_name: data.session.session_name,
            venue_name: data.session.venue_name,
          });
          try {
            setQrPayload(buildPromptPayPayload(PROMPTPAY_MERCHANT_ID, sessionFee));
          } catch (err) {
            console.error("PromptPay payload error:", err);
          }
        }
      } catch (err) {
        console.error("Load session info error:", err);
      }
    })();
  }, [sessionId]);

  const simulateScan = async () => {
    if (scanning) return;
    setScanning(true);

    // Short artificial delay to mimic a scan + bank auth round-trip
    await new Promise((resolve) => setTimeout(resolve, 1500));

    try {
      const data = await authFetch(`/sessions/${sessionId}/join`, { method: "POST" });
      if (data.ok) {
        router.replace({
          pathname: "/payment/success" as any,
          params: {
            sessionId: String(sessionId),
            amount: String(fee),
          },
        });
      } else {
        Alert.alert("Payment Failed", data.message || "Could not complete payment");
        setScanning(false);
      }
    } catch (err) {
      console.error("Simulate scan error:", err);
      Alert.alert("Payment Failed", "Network error. Please try again.");
      setScanning(false);
    }
  };

  const qrUrl = qrPayload
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=0&data=${encodeURIComponent(
        qrPayload
      )}`
    : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={r(26)} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment</Text>
        <View style={{ width: r(34) }} />
      </View>

      <View style={styles.content}>
        <View style={styles.brandRow}>
          <View style={styles.brandBadge}>
            <Text style={styles.brandBadgeText}>PromptPay</Text>
          </View>
          <MaterialCommunityIcons name="shield-check" size={r(18)} color="#10B981" />
        </View>

        <View style={styles.qrCard}>
          <View style={styles.qrFrame}>
            {qrUrl ? (
              <Image source={{ uri: qrUrl }} style={styles.qr} />
            ) : (
              <ActivityIndicator color="#0B36F4" />
            )}
          </View>

          <Text style={styles.merchantLabel}>Merchant</Text>
          <Text style={styles.merchantName}>
            {sessionInfo?.session_name || sessionInfo?.venue_name || "Capstone Court"}
          </Text>

          <View style={styles.divider} />

          <Text style={styles.amountLabel}>Amount</Text>
          <Text style={styles.amountValue}>฿ {fee.toFixed(2)}</Text>
        </View>

        <Text style={styles.hint}>
          Scan this code with any Thai banking app to pay. Tap below to simulate a scan.
        </Text>

        <TouchableOpacity
          style={[styles.scanButton, scanning && styles.scanButtonDisabled]}
          onPress={simulateScan}
          disabled={scanning}
        >
          {scanning ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons name="qrcode-scan" size={r(18)} color="#fff" />
              <Text style={styles.scanButtonText}>Simulate Scan &amp; Pay</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: r(50),
    paddingHorizontal: r(16),
    paddingBottom: r(12),
    backgroundColor: "#fff",
    borderBottomColor: "#F1F5F9",
    borderBottomWidth: 1,
  },
  backBtn: { padding: r(4) },
  headerTitle: { fontFamily: "Lexend_700Bold", fontSize: r(16), color: "#0F172A" },
  content: { flex: 1, padding: r(20), alignItems: "center" },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: r(8),
    marginBottom: r(16),
  },
  brandBadge: {
    backgroundColor: "#0B36F4",
    paddingHorizontal: r(14),
    paddingVertical: r(6),
    borderRadius: r(20),
  },
  brandBadgeText: {
    color: "#fff",
    fontFamily: "Lexend_700Bold",
    fontSize: r(13),
    letterSpacing: 0.5,
  },
  qrCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: r(20),
    padding: r(22),
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  qrFrame: {
    width: r(240),
    height: r(240),
    borderRadius: r(14),
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: r(18),
  },
  qr: { width: r(240), height: r(240), resizeMode: "contain" },
  merchantLabel: {
    fontFamily: "Lexend_400Regular",
    fontSize: r(11),
    color: "#94A3B8",
  },
  merchantName: {
    fontFamily: "Lexend_600SemiBold",
    fontSize: r(15),
    color: "#0F172A",
    marginTop: r(2),
  },
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: r(14),
  },
  amountLabel: {
    fontFamily: "Lexend_400Regular",
    fontSize: r(11),
    color: "#94A3B8",
  },
  amountValue: {
    fontFamily: "Lexend_700Bold",
    fontSize: r(30),
    color: "#0B36F4",
    marginTop: r(2),
  },
  hint: {
    marginTop: r(18),
    textAlign: "center",
    fontFamily: "Lexend_400Regular",
    fontSize: r(12),
    color: "#64748B",
    paddingHorizontal: r(10),
  },
  scanButton: {
    marginTop: r(24),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: r(8),
    backgroundColor: "#0B36F4",
    paddingVertical: r(14),
    paddingHorizontal: r(32),
    borderRadius: r(14),
    width: "100%",
  },
  scanButtonDisabled: { opacity: 0.7 },
  scanButtonText: {
    color: "#fff",
    fontFamily: "Lexend_700Bold",
    fontSize: r(15),
  },
});
