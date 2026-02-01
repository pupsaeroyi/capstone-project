import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, useWindowDimensions } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Button } from "@/components/Button";
import { PasswordInput } from "@/components/PasswordInput";
import { Input } from "@/components/Input";
import { API_BASE } from "@/lib/api";

export default function ResetPassword() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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

      alert("Password reset successful! Please return to the app and log in with your new password.");
      setSuccess(true);
      setNewPassword("");
      setConfirmPassword("");

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
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        style={[styles.container, { flex: 1 }]}
        contentContainerStyle={[styles.content, isLargeScreen ? styles.contentLarge : null]}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.form}>
          <View style={[styles.formCard, isLargeScreen ? styles.formCardLarge : null]}>
            <Text style={styles.title}>
              {isLargeScreen ? "Create new password" : "Create new\nPassword"}
            </Text>

            <Text style={styles.subtitle}>
              Enter a new password for your account.
            </Text>

            <View style={{ height: 20 }} />

            <PasswordInput
              placeholder="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              returnKeyType="next"
              editable={!success}
            />

            <PasswordInput
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              returnKeyType="done"
              onSubmitEditing={handleReset}
              editable={!success}
            />

            <View style={styles.buttonWrapper}>
              <Button
                title={success ? "Password Updated" : loading ? "Changing..." : "Change Password"}
                onPress={handleReset}
                disabled={loading || success}
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

  contentLarge: {
    alignItems: "center"
  },

  form: {
    width: "100%",
    alignItems: "center"
  },

  formCard: {
    width: "95%"
  },

  formCardLarge: {
    width: "100%",
    maxWidth: 520
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
