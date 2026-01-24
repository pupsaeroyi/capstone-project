import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { API_BASE } from "@/lib/api";
import { ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function ForgotPassword() {
    const router = useRouter();
    const [identifier, setIdentifier] = useState("");
    const [loading, setLoading] = useState(false);

    const handleContinue = async () => {
        if (!identifier) {
            alert("Please enter your username or email.");
            return;
        }

        try {
            setLoading(true);

            const res = await fetch(`${API_BASE}/auth/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: identifier }),
            });

            const data = await res.json();
            alert(
                data.message || "If the account exists, a password reset link has been sent."
            );
        
        router.back();
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
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                <ScrollView
                    style={[styles.container, { flex: 1 }]}
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
                            <Text style={styles.title}>Find your account</Text>
                            <Text style={styles.subtitle}>
                                Enter your username or email.
                            </Text>
                            <View style={{ height: 24 }} /> 
                            <Input
                                placeholder="Username or Email"
                                value={identifier}
                                onChangeText={setIdentifier}
                                autoCapitalize="none"
                                autoCorrect={false}
                                keyboardType="email-address"
                                returnKeyType="done"
                                onSubmitEditing={handleContinue}        
                            />
                            <View style={styles.buttonWrapper}>
                                <Button 
                                    title={loading ? "Sending..." : "Continue"}
                                    onPress={handleContinue}
                                    disabled={loading}
                                />
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

  header: {
    width: "100%",
    marginBottom: 24,
    left: 15,
  },

  content: {
    flexGrow: 1,
    paddingTop: 72,
  },

  form: {
    width: "100%",
    alignItems: "center",
  },

  formCard: {
    width: "85%",
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    lineHeight: 34,
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 14,
    color: "#666",
  },

  buttonWrapper: {
    marginTop: 18,
  },
});