import { View, Text, StyleSheet, ScrollView, Image, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { useState } from "react";
import { getSavedToken } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { r } from "@/utils/responsive";

export default function Account() {
    const router = useRouter();
		const { user } = useAuth();

    return (
        <View style={{ flex: 1, backgroundColor: "#fff" }}>
        	<ScrollView
          	style={[styles.container, { flex: 1 }]}
          	contentContainerStyle={styles.content}
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

						<View style={styles.title}>
							<Text style={styles.titleText}>Edit Profile</Text>
						</View>




					</ScrollView>	

        </View>

    )

} const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    paddingHorizontal: "10%",
  },
  
  content: {
    flexGrow: 1,
    paddingTop: 28,
  },

  header: {
    width: "100%",
	marginTop: 12,
    marginLeft: -8,
  },

	title: {
		alignItems: "center",
	},

	titleText: {
		fontFamily: "Lexend_600SemiBold",
		fontSize: r(18),
		color: "#0F172A",
	},


});