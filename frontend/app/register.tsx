import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard} from "react-native";
import { Link, useRouter } from "expo-router";
import { useState, useRef } from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { PasswordInput } from "@/components/PasswordInput";
import { API_BASE } from "@/lib/api";
import Ionicons from "@expo/vector-icons/build/Ionicons";
import LoadingIcon from "@/components/LoadingIcon";
import { AntDesign } from "@expo/vector-icons";


export default function Register() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
  });

  const [usernameStatus, setUsernameStatus] = useState("idle");
  const usernameReqId = useRef(0);

  const handleUsernameChange = async (text: string) => {
    const trimmed = text.trim();
    setFormData((prev) => ({ ...prev, username: trimmed }));
    const reqId = ++usernameReqId.current;

    if (trimmed.length === 0) {
      setUsernameStatus("idle");
      return;
    }

    if (trimmed.length < 3) {
      setUsernameStatus("tooShort");
      return;
    }

    setUsernameStatus("checking");

    try {
      const res = await fetch(
        `${API_BASE}/auth/check-username?username=${encodeURIComponent(trimmed)}`
      );
      const data = await res.json();
      // ignore if this response is for an older input
      if (reqId !== usernameReqId.current) return;
      setUsernameStatus(data.available ? "available" : "taken");
    } catch {
      if (reqId !== usernameReqId.current) return;
      setUsernameStatus("idle");
    }
  };


  const handleRegister = async () => {
    const username = formData.username.trim();
    const email = formData.email.trim().toLowerCase();

    if (!username || !email || !formData.password || !formData.confirmPassword) {
      alert("Please fill in all fields")
      return;
    }

    if (usernameStatus === "checking") {
      alert("Checking username availability… please wait.");
      return;
    }

    if (usernameStatus === "taken") {
      alert("Username is already taken.");
      return;
    }

    if (usernameStatus === "tooShort") {
      alert("Username must be at least 3 characters.");
      return;
    }

    if (username.length >= 3 && usernameStatus !== "available") {
      alert("Please choose an available username.");
      return;
    }

    if (!email.includes("@")) {
      alert("Please enter a valid email.")
      return;
    }


    if (formData.password.length < 8) {
      alert("Password must be at least 8 characters.");
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          email,
          password: formData.password,
        }),
      });

      const data = await res.json();
      console.log("REGISTER: ", data);

      if (!res.ok || !data.ok) {
        alert(data.message || "Registration failed. Please try again.");
        return;
      }
      
      router.replace({
        pathname: "/verify-email",
        params: { email },
      });
    } catch (err: any) {
      console.log(err);
      alert("Cannot connect to server. Is backend running?");
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
          style={[styles.container, {flex: 1}]}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

        
          <View style={styles.form}>
            <View style={styles.formCard}>
              <Text style={styles.title}>Register{'\n'}To the club</Text>
              
            </View>
          </View>
          
          <View style={styles.form}>
            <View style={styles.formCard}>

              <Input
                placeholder="Email"
                value={formData.email}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, email: text }))}
              />

              <View style={styles.usernameWrapper}>
                <Input
                  placeholder="Username"
                  value={formData.username}
                  onChangeText={handleUsernameChange}
                  style={[
                    styles.usernameInput,
                    (usernameStatus === "taken" || usernameStatus === "tooShort") && styles.inputError,
                  ]}
                />

                <View style={styles.iconWrapper}>
                  {usernameStatus === "checking" && <LoadingIcon />}

                  {usernameStatus === "available" && (
                    <AntDesign name="check-circle" size={18} color="green" />
                  )}

                  {(usernameStatus === "taken" || usernameStatus === "tooShort") && (
                    <Ionicons name="close-circle" size={21} color="red" />
                  )}
                </View>
              </View>
                    
              <PasswordInput
                placeholder="Password"
                value={formData.password}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, password: text }))}
              />

              <PasswordInput
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, confirmPassword: text }))
                }
              />

              <View style={styles.buttonWrapper}>
                <Button title="Register" onPress={handleRegister} />
              </View>
            </View>

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account?</Text>
              <Link href="/login" style={styles.loginLink}>
                Back to Login
              </Link>
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
    paddingHorizontal: "10%",
  },

  content: {
    flexGrow: 1,
    paddingTop: 70,
    paddingBottom: 40, 
  },

  header: {
    width: "100%",
    marginBottom: 24,
    left: 15,
  },

  title: { 
    fontSize: 32, 
    fontWeight: "bold",
  },

  form: { 
    width: "100%", 
    alignItems: "center",
  },

  formCard: { 
    width: "100%", 
    marginBottom: 32,
  },

  buttonWrapper: { 
    marginTop: 12,
  },

  loginContainer: { 
    alignItems: "center", 
    gap: 5,
  },

  loginText: { 
    fontSize: 14, 
    color: "#666",
  },

  loginLink: { 
    fontSize: 14, 
    color: "#007AFF", 
    fontWeight: "500",
  },

usernameWrapper: {
  position: "relative",
  
},

usernameInput: {
  paddingRight: 44,
},

inputError: {
  borderColor: "red",
},

iconWrapper: {
  position: "absolute",
  right: 14,
  top: 0,
  bottom: 12,
  justifyContent: "center",
  alignItems: "center",
},


});
