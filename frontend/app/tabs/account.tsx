import { View, Text, StyleSheet, ScrollView, Image, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { useState, useEffect } from "react";
import { getSavedToken } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { r } from "@/utils/responsive";
import  MenuButton  from "@/components/MenuButton";
import SideMenu from "@/components/SideMenu";
import { API_BASE } from "@/lib/api";

export default function Account() {
    const router = useRouter();
		const { user } = useAuth();
		const [menuOpen, setMenuOpen] = useState(false);

	// State for profile data and loading status
		const [profile, setProfile] = useState<any>(null);
		const [loading, setLoading] = useState(true);

		// Fetch the full profile from your backend
		useEffect(() => {
			const fetchProfile = async () => {
				try {
					const token = await getSavedToken();
					if (!token) return;

					const response = await fetch(`${API_BASE}/profile/me`, {
						headers: {
							Authorization: `Bearer ${token}`,
						},
					});

					const data = await response.json();

					console.log("DEBUG PROFILE DATA", JSON.stringify(data, null, 2));
					if (data.ok) {
						setProfile(data.profile);
					}
				} catch (error) {
					console.error("Error fetching profile:", error);
				} finally {
					setLoading(false);
				}
			};

			fetchProfile();
		}, []);

    return (
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
					<View style={styles.header}>
						<MenuButton onPress={() => setMenuOpen(true)} />
					</View>

						<SideMenu
						  visible={menuOpen}
						  onClose={() => setMenuOpen(false)}
						/>

        <ScrollView
          style={[styles.container, { flex: 1 }]}
        	contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false} 
				>
					<View style={styles.title}>
						<Text style={styles.titleText}>
							  	{user?.username ?? "Player"}
						</Text>

						<View style={styles.avatarCircle}>
							<Ionicons name="person" size={r(36)} color="#0B36F4" />
						</View>

						<Text style={styles.RankLabel}>Athlete Rank</Text>

						<Text style={styles.RankValue}>
              {profile?.rank ?? "Unranked"}
            </Text>

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
    alignItems: "flex-end", 
		backgroundColor: "#fff",
		paddingTop: r(50),
    paddingHorizontal: r(20),
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
	},

	RankValue: {
		fontFamily: "Lexend_700Bold",
		fontSize: r(20),
		color: "#0F172A",
		marginTop: r(8),
	},

});