import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Button } from "@/components/Button";
import { API_BASE } from "@/lib/api";
import { OtpInput } from "@/components/OtpInput";
import { Ionicons } from "@expo/vector-icons";

export default function VerifyEmail() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string }>();

  const safeEmail = typeof email === "string" ? email : "";

  const [code, setCode] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);  
  const [resendLoading, setResendLoading] = useState(false);

  const handleVerify = async () => {
    if (!safeEmail) {
      alert("Missing email. Please register again.");
      return;
    }

    if (code.length !== 6) {
      alert("Please enter the 6-digit code.");
      return;
    }

    try {
      setVerifyLoading(true);

      const res = await fetch(`${API_BASE}/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: safeEmail, code }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        alert(data.message || "Invalid or expired code.");
        return;
      }

      alert("Email verified! Please log in.");
      router.replace("/login");
    } catch (err) {
      console.log(err);
      alert("Cannot connect to server");
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleResend = async () => {
    if (!safeEmail) {
      alert("Missing email. Cannot resend code.");
      return;
    }

    try {
      setResendLoading(true);

      const res = await fetch(`${API_BASE}/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: safeEmail }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        alert(data.message || "Failed to resend verification code.");
        return;
      }

      alert("A new code has been sent to your email!");
    } catch (err) {
      console.log(err);
      alert("Cannot connect to server.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fff" }}
      behavior={Platform.OS === "ios" ? "padding" : "padding"}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
            <Ionicons
             name="chevron-back"
             size={28}
             color="#000"
             onPress={() => router.back()}>
        </Ionicons>
        </View>
        <View style={styles.form}>
          <View style={styles.formCard}>
            <Text style={styles.title}>Verify your email</Text>

            <Text style={styles.subtitle}>
              We’ve sent a 6-digit code to{" "}
              <Text style={{ fontWeight: "600", color: "#333" }}>{safeEmail || "your email"}</Text>.
        
            </Text>

            <View style={{ height: 26 }} />

            <Text style={styles.label}>Enter Code</Text>
            <View style={{ height: 10 }} />

            <View style={{ width: "100%" }}>
              <OtpInput onChange={setCode} disabled={verifyLoading || resendLoading} />
            </View>
            
            <View style={{ height: 26 }} />

            <Button
              title={verifyLoading ? "Verifying..." : "Confirm"}
              onPress={handleVerify}
              disabled={verifyLoading || resendLoading}
            />

            <View style={styles.helperContainer}>
              <Text style={styles.helper}>Didn't receive the code?</Text>
              <Text 
                style={[
                  styles.resendLink,
                  resendLoading && { color: "#999" }  // ← Gray out when loading
                ]}
                onPress={resendLoading ? undefined : handleResend}  // ← Disable when loading
              >
                {resendLoading ? "Resending..." : "Resend code"}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({

  container: {
    backgroundColor: "#fff",
    paddingHorizontal: "10%",
  },
  
  header: {
    width: "100%",
    marginBottom: 24,
    marginLeft: -8,
  },
  
  content: {
    flexGrow: 1,
    paddingTop: 90,
    paddingBottom: 40,
  },
  form: {
    width: "100%",
    alignItems: "center",
  },
  formCard: {
    width: "100%",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    lineHeight: 34,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#555",
  },
  helper: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
  },

  helperContainer: {
    marginTop: 14,
    alignItems: "center",
    gap: 6,
  },

  resendLink: {
  fontSize: 13,
  color: "#007AFF",
  fontWeight: "500",
  textAlign: "center",
  },


});
