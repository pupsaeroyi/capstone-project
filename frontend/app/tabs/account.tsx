import { View, Text, StyleSheet, ScrollView, Image, Pressable, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
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
		const { user, profile } = useAuth();
		const [menuOpen, setMenuOpen] = useState(false);
		const [loading, setLoading] = useState(true);

    return (
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
					<View style={styles.header}></View>

        <ScrollView
          style={[styles.container, { flex: 1 }]}
        	contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false} 
				>
					<View style={styles.menuButtonContainer}>
						<MenuButton onPress={() => setMenuOpen(true)} />
					</View>
					
					<SideMenu
						visible={menuOpen}
						onClose={() => setMenuOpen(false)}
					/>

					<View style={styles.title}>
						<Text style={styles.titleText}>
							  	{profile?.username ?? user?.username ?? "Player"}
						</Text>

						<View style={styles.avatarCircle}>
							{profile?.avatar_url ? (
								<Image 
									source={{ uri: profile.avatar_url }}
									style={styles.avatarImage}
								/>
							) : (
								<MaterialIcons name="person" size={r(42)} color="#0B36F4" />
							)}
						</View>

						<Text style={styles.RankLabel}>Athlete Rank</Text>

						{profile?.questionnaire_done ? (
								<Text style={styles.RankValue}>{profile.rank}</Text>
						) : (
							<>
								<Text style={styles.RankValue}>Unranked</Text>
								<TouchableOpacity 
									style={styles.unrankedButton}
									onPress={() => router.push("/questionnaire")}
									activeOpacity={0.7}
								>
									<Ionicons name="clipboard" size={r(16)} color="#0B36F4" />
									<Text style={styles.unrankedButtonText}>Complete Questionnaire</Text>
								</TouchableOpacity>
							</>
						)}

						{/* Stats Row */}
						<View style={styles.statsRow}>
							<View style={styles.statCard}>
								<Text style={styles.statLabel}>Matches</Text>
								<Text style={styles.statValue}>{profile?.matches_played ?? 0}</Text>
							</View>

							<View style={styles.statCard}>
								<Text style={styles.statLabel}>Win Rate</Text>
								<Text style={styles.statValue}>
									{profile?.matches_played && profile.matches_played > 0
										? Math.round((profile.wins / profile.matches_played) * 100)
										: 0}%
								</Text>
							</View>
						</View>
						{/* Information Sections */}
						<View style={styles.infoSection}>
							<Text style={styles.fieldLabel}>Age</Text>
							<View style={styles.fieldCard}>
								<Text style={styles.fieldText}>{profile?.age ?? "Not Set"}</Text>
							</View>

							<Text style={styles.fieldLabel}>MBTI Type</Text>
							<View style={styles.fieldCard}>
								<Text style={styles.fieldText}>{profile?.mbti_type ?? "Not Set"}</Text>
							</View>

							<Text style={styles.fieldLabel}>Preferred Positions</Text>
							<View style={styles.positionsContainer}>
								{["Setter", "Libero", "Outside Hitter", "Middle Blocker", "Opposite Hitter"].map((pos) => {
									const isActive = [profile?.pos1, profile?.pos2, profile?.pos3].includes(pos);
									
									return (
										<View 
											key={pos} 
											style={[styles.positionBadge, isActive ? styles.activeBadge : styles.inactiveBadge]}
										>
											<Text style={[styles.positionText, isActive ? styles.activeText : styles.inactiveText]}>
												{pos}
											</Text>
											{isActive && <Ionicons name="checkmark-circle" size={16} color="#fff" />}
										</View>
									);
								})}
							</View>
						</View>

					</View>


		

					</ScrollView>	

        </View>

    )

} const styles = StyleSheet.create({

  container: {
    backgroundColor: "#fff",
    paddingHorizontal: "10%",
  },
  menuButtonContainer: {
		position: "absolute",
		right: r(-10),
		top: r(-4),
	},
  content: {
    flexGrow: 1,
    paddingTop: 0,
		paddingBottom: r(120),
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
		marginBottom: r(18),
	},

  avatarCircle: {
    width: r(90),
    height: r(90),
    borderRadius: r(45),
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
		marginBottom: r(18),
		overflow: "hidden",
  },

	avatarImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
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

	unrankedButton: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#EEF2FF", 
		paddingVertical: r(10),
		paddingHorizontal: r(16),
		borderRadius: r(24),        
		marginTop: r(12),
		gap: r(6),                 
	},
		
	unrankedButtonText: {
		fontFamily: "Lexend_600SemiBold",
		fontSize: r(14),
		color: "#0B36F4",        
	},
	statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: r(18),
    marginBottom: r(18),
    gap: r(0),
  },

  statCard: {
    flex: 1,
    backgroundColor: "#F8FAFC", 
    paddingVertical: r(18),
    borderRadius: r(16),
    alignItems: "center",
		marginHorizontal: r(12),
    borderWidth: 1,
    borderColor: "#E7EBFE",
  },
  statLabel: {
    fontFamily: "Lexend_600SemiBold",
    fontSize: r(14),
    color: "#0B36F4",
    marginBottom: r(4),
  },
  statValue: {
    fontFamily: "Lexend_700Bold",
    fontSize: r(20),
    color: "#0B36F4",
  },
	infoSection: {
    width: "100%",
    gap: r(12),
  },

  fieldLabel: {
    fontFamily: "Lexend_600SemiBold",
    fontSize: r(14),
    color: "#64748B",
  },

  fieldCard: {
    backgroundColor: "#F8FAFC",
    paddingVertical: r(12),
    paddingHorizontal: r(20),
    borderRadius: r(16),
  },

  fieldText: {
    fontFamily: "Lexend_700Bold",
    fontSize: r(15),
    color: "#0F172A",
  },

  positionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap", 
    gap: r(8),
    marginTop: r(4),
  },

  positionBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: r(8),
    paddingHorizontal: r(14),
    borderRadius: r(24),
    gap: r(6),
  },
  activeBadge: {
    backgroundColor: "#0B36F4",
  },
  inactiveBadge: {
    backgroundColor: "#F1F5F9",
  },
  positionText: {
    fontFamily: "Lexend_600SemiBold",
    fontSize: r(13),
  },
  activeText: {
    color: "#FFFFFF",
  },
  inactiveText: {
    color: "#64748B",
  },

});