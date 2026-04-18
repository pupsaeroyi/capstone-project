import { View, Text, StyleSheet, ScrollView, Image, Pressable, TouchableOpacity, RefreshControl, Modal, TextInput, Alert, FlatList } from "react-native";
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
import { API_BASE, authFetch } from "@/lib/api";
import * as ImagePicker from "expo-image-picker";

export default function Account() {
    const router = useRouter();
		const { user, profile, setProfile, refreshProfile } = useAuth();
		const [menuOpen, setMenuOpen] = useState(false);
		const [loading, setLoading] = useState(true);
		const [refreshing, setRefreshing] = useState(false);
		const [refreshOffset, setRefreshOffset] = useState(0);
		const [ageModalOpen, setAgeModalOpen] = useState(false);
		const [mbtiModalOpen, setMbtiModalOpen] = useState(false);
		const [editAge, setEditAge] = useState("");

		const MBTI_TYPES = [
			"INTJ","INTP","ENTJ","ENTP",
			"INFJ","INFP","ENFJ","ENFP",
			"ISTJ","ISFJ","ESTJ","ESFJ",
			"ISTP","ISFP","ESTP","ESFP",
		];

		const onRefresh = async () => {
        setRefreshing(true);
        await refreshProfile();
        setRefreshing(false);
    };

		const saveAge = async () => {
			const parsed = parseInt(editAge, 10);
			if (isNaN(parsed) || parsed < 1 || parsed > 120) {
				Alert.alert("Invalid", "Please enter a valid age (1-120)");
				return;
			}
			try {
				const data = await authFetch("/profile/me", {
					method: "PATCH",
					body: JSON.stringify({ age: parsed }),
				});
				if (data.ok) {
					await refreshProfile();
					setAgeModalOpen(false);
				} else {
					Alert.alert("Error", data.message);
				}
			} catch {
				Alert.alert("Error", "Failed to update age");
			}
		};

		const saveMbti = async (type: string) => {
			try {
				const data = await authFetch("/profile/me", {
					method: "PATCH",
					body: JSON.stringify({ mbti_type: type }),
				});
				if (data.ok) {
					await refreshProfile();
					setMbtiModalOpen(false);
				} else {
					Alert.alert("Error", data.message);
				}
			} catch {
				Alert.alert("Error", "Failed to update MBTI type");
			}
		};

		const handlePickImage = async () => {
			const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

			if (!permission.granted) {
				Alert.alert("Permission needed", "Allow access to photos");
				return;
			}

			const result = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ImagePicker.MediaTypeOptions.Images,
				quality: 0.7,
			});

			if (!result.canceled) {
				const image = result.assets[0];
				await uploadImage(image);
			}
		};

		const uploadImage = async (image: any) => {
			const formData = new FormData();

			formData.append("file", {
				uri: image.uri,
				name: "avatar.jpg",
				type: image.mimeType || "image/jpeg"
			} as any);

			try {
				const res = await fetch(API_BASE + "/upload/avatar", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${await getSavedToken()}`,
				},
				body: formData,
				});

				const data = await res.json();

				if (data.ok) {
					setProfile((prev: any) => ({
						...prev,
						avatar_url: data.url,
					}));
					await refreshProfile(); 
					console.log("UPLOAD RESPONSE:", data);
					console.log("UPDATED PROFILE:", profile);
				} else {
				Alert.alert("Upload failed", data.message);
				}
			} catch (err) {
				Alert.alert("Error", "Upload failed");
			}
		};

		useEffect(() => {
			const t = setTimeout(() => setRefreshOffset(40), 100);
			return () => clearTimeout(t);
		}, []);

    return (
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
					<View style={styles.header}></View>

        <ScrollView
          style={[styles.container, { flex: 1 }]}
        	contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false} 
					refreshControl={
						<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0B36F4" progressViewOffset={refreshOffset} />
					}
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

						<TouchableOpacity onPress={handlePickImage}>
							<View style={styles.avatarCircle}>
								{profile?.avatar_url ? (
									<Image 
										source={{ uri: profile.avatar_url }}
										style={styles.avatarImage}
									/>
								) : (
									<View style={styles.avatarPlaceholder}>
										<Text style={styles.avatarInitial}>
											{(profile?.username || user?.username || "P")[0].toUpperCase()}
										</Text>
									</View>
								)}
							</View>
						</TouchableOpacity>

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
								<Text style={styles.statLabel}>ELO</Text>
								<Text style={styles.statValue}>
									{profile?.rating_score ?? 0}
								</Text>
							</View>
						</View>
						{/* Information Sections */}
						<View style={styles.infoSection}>
							<Text style={styles.fieldLabel}>Age</Text>
							<TouchableOpacity style={styles.fieldCard} activeOpacity={0.7} onPress={() => { setEditAge(profile?.age?.toString() || ""); setAgeModalOpen(true); }}>
								<Text style={styles.fieldText}>{profile?.age ?? "Not Set"}</Text>
								<MaterialIcons name="edit" size={r(16)} color="#94A3B8" />
							</TouchableOpacity>

							<Text style={styles.fieldLabel}>MBTI Type</Text>
							<TouchableOpacity style={styles.fieldCard} activeOpacity={0.7} onPress={() => setMbtiModalOpen(true)}>
								<Text style={styles.fieldText}>{profile?.mbti_type ?? "Not Set"}</Text>
								<MaterialIcons name="edit" size={r(16)} color="#94A3B8" />
							</TouchableOpacity>

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

			{/* Age Edit Modal */}
			<Modal visible={ageModalOpen} transparent animationType="fade">
				<Pressable style={styles.modalBackdrop} onPress={() => setAgeModalOpen(false)}>
					<View style={styles.modalCard} onStartShouldSetResponder={() => true}>
						<Text style={styles.modalTitle}>Edit Age</Text>
						<TextInput
							style={styles.modalInput}
							value={editAge}
							onChangeText={setEditAge}
							keyboardType="number-pad"
							placeholder="Enter your age"
							placeholderTextColor="#94A3B8"
							autoFocus
						/>
						<View style={styles.modalButtons}>
							<TouchableOpacity style={styles.modalCancelBtn} onPress={() => setAgeModalOpen(false)}>
								<Text style={styles.modalCancelText}>Cancel</Text>
							</TouchableOpacity>
							<TouchableOpacity style={styles.modalSaveBtn} onPress={saveAge}>
								<Text style={styles.modalSaveText}>Save</Text>
							</TouchableOpacity>
						</View>
					</View>
				</Pressable>
			</Modal>

			{/* MBTI Picker Modal */}
			<Modal visible={mbtiModalOpen} transparent animationType="fade">
				<View style={styles.mbtiModalContainer}>
					<Pressable style={styles.modalBackdropFull} onPress={() => setMbtiModalOpen(false)} />
					<View style={styles.mbtiSheet}>
						<View style={styles.mbtiSheetHeader}>
							<Text style={styles.modalTitle}>Select MBTI Type</Text>
							<TouchableOpacity onPress={() => setMbtiModalOpen(false)}>
								<Ionicons name="close" size={r(24)} color="#0F172A" />
							</TouchableOpacity>
						</View>
						<View style={styles.mbtiGrid}>
							{MBTI_TYPES.map((type) => (
								<TouchableOpacity
									key={type}
									style={[styles.mbtiChip, profile?.mbti_type === type && styles.mbtiChipActive]}
									onPress={() => saveMbti(type)}
								>
									<Text style={[styles.mbtiChipText, profile?.mbti_type === type && styles.mbtiChipTextActive]}>
										{type}
									</Text>
								</TouchableOpacity>
							))}
						</View>
					</View>
				</View>
			</Modal>

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

  avatarPlaceholder: {
	width: "100%",
	height: "100%",
    borderRadius: r(45),
    backgroundColor: "#0B36F4",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarInitial: {
    fontSize: r(36),
    fontFamily: "Lexend_700Bold",
    color: "#fff",
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
    paddingVertical: 18,
    borderRadius: r(16),
    alignItems: "center",
	marginHorizontal: 18,
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
    fontSize: r(22),
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    paddingVertical: r(12),
    paddingHorizontal: r(20),
    borderRadius: 28,
	borderColor: "#E7EBFE",
    borderWidth: 1,

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

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: r(30),
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: r(20),
    padding: r(24),
    width: "100%",
  },
  modalTitle: {
    fontSize: r(17),
    fontFamily: "Lexend_700Bold",
    color: "#0F172A",
    marginBottom: r(16),
  },
  modalInput: {
    backgroundColor: "#F8FAFC",
    padding: r(14),
    borderRadius: r(12),
    borderWidth: 1,
    borderColor: "#E2E8F0",
    fontSize: r(16),
    fontFamily: "Lexend_500Medium",
    color: "#0F172A",
    marginBottom: r(20),
  },
  modalButtons: {
    flexDirection: "row",
    gap: r(12),
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: r(12),
    borderRadius: r(12),
    backgroundColor: "#F1F5F9",
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: r(14),
    fontFamily: "Lexend_600SemiBold",
    color: "#64748B",
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: r(12),
    borderRadius: r(12),
    backgroundColor: "#0B36F4",
    alignItems: "center",
  },
  modalSaveText: {
    fontSize: r(14),
    fontFamily: "Lexend_700Bold",
    color: "#FFFFFF",
  },

  mbtiModalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdropFull: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  mbtiSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: r(24),
    borderTopRightRadius: r(24),
    paddingBottom: r(40),
    padding: r(20),
  },
  mbtiSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: r(20),
  },
  mbtiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: r(10),
  },
  mbtiChip: {
    width: "22%",
    paddingVertical: r(12),
    borderRadius: r(12),
    backgroundColor: "#F1F5F9",
    alignItems: "center",
  },
  mbtiChipActive: {
    backgroundColor: "#0B36F4",
  },
  mbtiChipText: {
    fontSize: r(13),
    fontFamily: "Lexend_700Bold",
    color: "#0F172A",
  },
  mbtiChipTextActive: {
    color: "#FFFFFF",
  },

});