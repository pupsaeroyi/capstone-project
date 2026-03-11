import { View, Text, StyleSheet, ScrollView, Platform, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard } from "react-native";
import { Link, useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { PasswordInput } from "@/components/PasswordInput";
import Checkbox from "expo-checkbox";
import { API_BASE } from "@/lib/api";
import * as SecureStore from "expo-secure-store";
import { getSavedToken, fetchMe, clearSavedToken } from "@/lib/auth";
import { useWindowDimensions } from "react-native";
import { useAuth } from "@/context/AuthContext";

export default function Login() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const { width } = useWindowDimensions();
  const circleSizeLeft = width * 0.9;
  const circleSizeRight = width * 0.8;

  useEffect(() => {
    (async () => {
      try {
        const token = await getSavedToken();
        if (!token) return;

        const { res, data } = await fetchMe(token);
        if (res.ok && data.ok) {
          console.log("Auto-login success:", data.user.username);
          setUser(data.user);
          router.replace("/home");
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
      
      await SecureStore.setItemAsync("accessToken", token);
      await SecureStore.setItemAsync("rememberMe", rememberMe ? "true" : "false");

      setUser(data.user);

      alert(`Welcome ${data.user.username}!`);
      router.replace("/home");
      
    } catch (err: any) {
      console.log(err);
      alert("Cannot connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
    <KeyboardAvoidingView
      style={{ flex: 1}}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
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
              <View style={styles.header}>
                <Text style={styles.title}>Let’s Go Play{"\n"}Volleyball</Text>
                <Text style={styles.subtitle}>
                  Find your team, hit the court.
                </Text>
              </View>

              <Input
                placeholder="Username or Email"
                value={identifier}
                onChangeText={setIdentifier}
                style={styles.field}
                autoCapitalize='none'
                autoCorrect={false}
                keyboardType="default"
                returnKeyType="next"
              />

              <PasswordInput
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                style={styles.field}
                returnKeyType='done'
                onSubmitEditing={handleLogin}
              />

              <View style={styles.options}>
                <View style={styles.rememberRow}>
                  <Checkbox
                    value={rememberMe}
                    onValueChange={setRememberMe}
                    color={rememberMe ? "#0B36F4" : undefined}
                    style={styles.checkbox}
                  />
                  <Text style={styles.optionText}>  Remember me</Text>
                </View>

                <Text 
                  style={styles.forgotText}
                  onPress={() => router.push("/forgot-password")}
                  >
                  Forgot Password?</Text>
              </View>

              <View style={styles.buttonWrapper}>
                <Button 
                  title={loading ? "Logging in..." : "Login"}
                  onPress={handleLogin} 
                  disabled={loading} 
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.signupContainer}>
                <Text style={styles.signupText}>Don't have an account?</Text>
                <Link href="/register" style={styles.signupLink}>
                  Sign up here
                </Link>

                
                {__DEV__ && (
                  <Text
                    style={{ marginTop: 8, fontSize: 12, color: "#999" }}
                    onPress={() =>
                      router.push({
                        pathname: "/verify-email",
                        params: { email: "dev@test.com" },
                      })
                    }
                  >
                    Verify Email Page
                  </Text>
                )}

                {__DEV__ && (
                  <Text
                    style={{ fontSize: 12, color: "#999" }}
                    onPress={() =>router.replace("/home")
                    }
                  >
                    Home Page
                  </Text>
                )}


              </View>
            </View>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>

    <View style={styles.bottomDecoration} pointerEvents="none">
      <View
        style={[
          styles.circleLeft,
            {
              width: circleSizeLeft,
              height: circleSizeLeft,
              borderRadius: circleSizeLeft / 2,
              left: -circleSizeLeft * 0.35,
              bottom: -circleSizeLeft * 0.65,
            },
          ]}
      />

      <View
       style={[
          styles.circleRight,
            {
              width: circleSizeRight,
              height: circleSizeRight,
              borderRadius: circleSizeRight / 2,
              right: -circleSizeRight * 0.3,
              bottom: -circleSizeRight * 0.7,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    paddingHorizontal: "10%",
  },

  content: {
    flexGrow: 1,
    paddingTop: 80,
    paddingBottom: 40,
  },
  
  header: {
    alignItems: "center",
    marginBottom: 40,
  },

  title: {
    fontSize: 36,
    fontFamily: "Lexend_800ExtraBold",
    textAlign: "center",
    color: "#0F172A",
  },

  subtitle: {
    fontSize: 16,
    fontFamily: "Lexend_500Medium",
    textAlign: "center",
    color: "#64748B",
    marginTop: 14,
  },

  form: {
    width: "100%",
    alignItems: "center",
  },

  formCard: {
    width: "100%",
  },

  options: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  optionText: {
    fontSize: 14,
    color: "#475569",
    fontFamily: "Lexend_500Medium",
  },

  forgotText: {
    fontSize: 14,
    color: "#0B36F4",
    fontFamily: "Lexend_500Medium",
  },

  buttonWrapper: {
    marginTop: 16,
  },

  signupContainer: {
    alignItems: "center",
    gap: 6,
  },

  signupText: {
    fontSize: 14,
    color: "#737373",
    fontFamily: "Lexend_400Regular",
  },

  signupLink: {
    fontSize: 14,
    color: "#0B36F4",
    fontFamily: "Lexend_400Regular",
  },

  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
  },

  divider: {
    height: 1,
    backgroundColor: "#CFCFCF",
    marginVertical: 16,
    width: "100%",
   },

   bottomDecoration: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 60 : 140,
    left: 0,
    right: 0,
    
   },

   circleLeft: {
    position: "absolute",
    backgroundColor: "#F8FAFC",
  },

  circleRight: {
    position: "absolute",
    backgroundColor: "#F1F5F9",
  },

  field: {
    marginBottom: 16,
  },
});
