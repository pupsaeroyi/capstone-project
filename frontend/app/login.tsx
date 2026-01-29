import { View, Text, StyleSheet, ScrollView, Platform, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard } from "react-native";
import { Link, useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import Checkbox from "expo-checkbox";
import { API_BASE } from "@/lib/api";
import * as SecureStore from "expo-secure-store";
import { getSavedToken, fetchMe, clearSavedToken } from "@/lib/auth";

export default function Login() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await getSavedToken();
        if (!token) return;

        const { res, data } = await fetchMe(token);
        if (res.ok && data.ok) {
          console.log("Auto-login success:", data.user.username);
          // router.replace("/home"); (will be routed to home once home screen is ready)
        } else {
          await clearSavedToken();
        }
      } catch (err) {
        await clearSavedToken();
      }
    })();
  }, [router]);

  const handleLogin = async () => {
    if (!identifier || !password) {
      alert("Please enter username/email and password.");
      return;
    }
          
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          password,
        }),
      });

      const data = await res.json();
      console.log("LOGIN: ", data);
      
      if (!res.ok || !data.ok) {
        alert(data.message || "Login failed. Please try again.");
        return;
      }

      const token = data.accessToken;
      
      if (rememberMe) {
        await SecureStore.setItemAsync("accessToken", token);
      } else {
        await clearSavedToken();
      }

      alert(`Welcome ${data.user.username}!`);
      // reroute to home page later
      // router.replace("/home");
    } catch (err: any) {
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
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          style={[styles.container, { flex: 1 }]}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.form}>
            <View style={styles.formCard}>
              <Text style={styles.title}>Let’s{"\n"}Sign you in</Text>
              <View style={{ height: 24 }} />

              <Input
                placeholder="Username or Email"
                value={identifier}
                onChangeText={setIdentifier}
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

                <Text 
                  style={styles.forgotText}
                  onPress={() => router.push("/forgot-password")}
                  >
                  Forgot Password</Text>
              </View>

              <View style={styles.buttonWrapper}>
                <Button 
                  title={loading ? "Logging in..." : "Login"}
                  onPress={handleLogin} 
                  disabled={loading}
                />
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
    width: "95%",
  },

  options: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
