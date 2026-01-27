import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { API_BASE } from "@/lib/api";

export default function ResetPassword() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!token || typeof token !== "string") {
      alert("Invalid or missing reset token. Please request a new reset email.");
      return;
    }

    if (!newPassword || !confirmPassword) {
      alert("Please fill in both password fields.");
      return;
    }

    if (newPassword.length < 8) {
      alert("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newPassword
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await res.json();

      if (!res.ok || !data.ok) {
        alert(data.message || "Reset failed. Please try again.");
        return;
      }

      alert("Password reset successful! Please log in with your new password.");
      router.replace("/login");
    } catch (err) {
      console.log(err);
      alert("Cannot connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fff" }}
      behavior={Platform.OS === "ios" ? "padding" : "padding"}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        style={[styles.container, { flex: 1 }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.form}>
          <View style={styles.formCard}>
            <Text style={styles.title}>
              Create new{"\n"}password
            </Text>

            <Text style={styles.subtitle}>
              Enter a new password for your account.
            </Text>

            <View style={{ height: 20 }} />

            <Input
              placeholder="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              returnKeyType="next"
            />

            <Input
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleReset}
            />

            <View style={styles.buttonWrapper}>
              <Button
                title={loading ? "Changing..." : "Change Password"}
                onPress={handleReset}
                disabled={loading}
              />
            </View>

            <Text style={styles.helper}>
              If your link has expired, please request a new reset email.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    paddingHorizontal: 30
  },
  content: {
    flexGrow: 1,
    paddingTop: 90,
    paddingBottom: 40
  },
  form: {
    width: "100%",
    alignItems: "center"
  },
  formCard: {
    width: "85%"
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    lineHeight: 36
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: "#666"
  },
  buttonWrapper: {
    marginTop: 16
  },
  helper: {
    marginTop: 14,
    fontSize: 12,
    color: "#999",
    textAlign: "center"
  }
});
