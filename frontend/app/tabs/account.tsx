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
						<Text style={styles.titleText}>
							  	{user?.username ?? "Player"}
						</Text>

						<View style={styles.avatarCircle}>
							<Ionicons name="person" size={r(36)} color="#0B36F4" />
						</View>

						<Text style={styles.RankLabel}>Athlete Rank</Text>
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
		fontFamily: "Lexend_700Bold",
		fontSize: r(20),
		color: "#0F172A",
		marginBottom: r(36),
	},

  avatarCircle: {
    width: r(90),
    height: r(90),
    borderRadius: r(45),
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
		marginBottom: r(24),
  },

	RankLabel: {
		fontFamily: "Lexend_500Medium",
		fontSize: r(16),
		color: "#94A3B8",

	}


});