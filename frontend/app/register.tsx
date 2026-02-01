import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard} from "react-native";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
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
    fullName: "",
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
  });

  const [usernameStatus, setUsernameStatus] = useState("idle");

  const handleUsernameChange = async (text: string) => {
    const trimmed = text.trim();
    setFormData({ ...formData, username: trimmed });

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
      const res = await fetch(`${API_BASE}/auth/check-username?username=${text}`);
      const data = await res.json();
      setUsernameStatus(data.available ? "available" : "taken");
    } catch  {
      setUsernameStatus("idle");
    }
  };

  const handleRegister = async () => {

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
          username: formData.username,
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
        }),
      });

      const data = await res.json();
      console.log("REGISTER: ", data);

      if (!res.ok || !data.ok) {
        alert(data.message || "Registration failed. Please try again.");
        return;
      }

      alert(`Registration successful! Welcome ${data.user.username}!`);
      router.replace("/login");
    } catch (err: any) {
      console.log(err);
      alert("Cannot connect to server. Is backend running?");
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: "#fff" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
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
                placeholder="Full Name"
                value={formData.fullName}
                onChangeText={(text) => setFormData({ ...formData, fullName: text })}
              />

              <Input
                placeholder="Email"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
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
                onChangeText={(text) => setFormData({ ...formData, password: text })}
              />

              <PasswordInput
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })
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
    paddingHorizontal: 30,
  },

  content: {
    flexGrow: 1,
    paddingTop: 60,
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
    width: "95%", 
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
