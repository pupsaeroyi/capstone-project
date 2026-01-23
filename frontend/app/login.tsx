import { View, Text, StyleSheet, ScrollView, Platform, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard } from "react-native";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import Checkbox from "expo-checkbox";
import { API_BASE } from "@/lib/api";

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: username,
          password: password,
        }),
      });

      const data = await res.json();
      console.log("LOGIN: ", data);
      
      if (!res.ok || !data.ok) {
        alert(data.message || "Login failed. Please try again.");
        return;
      }

      alert(`Welcome ${data.user.username}!`);
      // router.replace("/(some-home-page)"); later
    } catch (err: any) {
      console.log(err);
      alert("Cannot connect to server. Is backend running?");
    }

  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fff" }}
      behavior={Platform.OS === "ios" ? "padding" : "padding"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          style={[styles.container, { flex: 1 }]}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.form}>
            <View style={styles.formCard}>
              <Text style={styles.title}>Let’s{"\n"}Go Golfing</Text>
              <View style={{ height: 24 }} />

              <Input
                placeholder="Username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize='none'
                autoCorrect={false}
                keyboardType="default"
                returnKeyType="next"
              />

              <Input
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                returnKeyType='done'
                onSubmitEditing={handleLogin}
              />

              <View style={styles.options}>
                <View style={styles.rememberRow}>
                  <Checkbox
                    value={rememberMe}
                    onValueChange={setRememberMe}
                    color={rememberMe ? "#000" : undefined}
                    style={styles.checkbox}
                  />
                  <Text style={styles.optionText}> Remember me</Text>
                </View>

                <Text style={styles.forgotText}>Forgot Password</Text>
              </View>

              <View style={styles.buttonWrapper}>
                <Button title="Login" onPress={handleLogin} />
              </View>

              <View style={styles.signupContainer}>
                <Text style={styles.signupText}>Don't have an account?</Text>
                <Link href="/register" style={styles.signupLink}>
                  Sign up here
                </Link>
              </View>
            </View>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    paddingHorizontal: 30,
  },

  content: {
    flexGrow: 1,
    paddingTop: 120,
    paddingBottom: 40,
  },

  title: {
    fontSize: 32,
    fontWeight: "bold",
    lineHeight: 36,
    textAlign: "left",
  },

  form: {
    width: "100%",
    alignItems: "center",
  },

  formCard: {
    width: "85%",
  },

  options: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    marginTop: 6,
  },

  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  optionText: {
    fontSize: 13,
    color: "#666",
  },

  forgotText: {
    fontSize: 13,
    color: "#999",
  },

  buttonWrapper: {
    marginTop: 6,
  },

  signupContainer: {
    alignItems: "center",
    marginTop: 22,
    gap: 6,
  },

  signupText: {
    fontSize: 14,
    color: "#666",
  },

  signupLink: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
  },

  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#000",
  },
});
