import { Modal, View, Text, StyleSheet, TouchableOpacity, Animated, useWindowDimensions, ActivityIndicator } from "react-native";
import { useEffect, useRef, useState } from "react";
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { getSavedToken, fetchMe, clearSavedToken } from "@/lib/auth";
import { API_BASE } from "@/lib/api";
import { useRouter, usePathname} from "expo-router";


type Props = {
  visible: boolean;
  onClose: () => void;
};

// Placeholder skill level (to be replaced with real data later)
const SKILL_LEVEL = "Intermediate";
const SKILL_COLOR = "#F59E0B";

export default function SideMenu({ visible, onClose }: Props) {
  const { width } = useWindowDimensions();
  const slideAnim = useRef(new Animated.Value(width)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [user, setUser] = useState<{ username: string; email: string } | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const pathname = usePathname();

  // Fetch user when menu is opened
  useEffect(() => {
    if (!visible) return;

    const loadUser = async () => {
      try {
        setLoadingUser(true);
        const token = await getSavedToken();

        if (token) {
          const { res, data } = await fetchMe(token);
          if (res.ok && data.ok) {
            setUser(data.user);
          }
        }

      } catch (err) {
        console.log("SideMenu: failed to fetch user", err);
      } finally {
        setLoadingUser(false);
      }
    };
    loadUser();
  }, [visible]);

  // Slide-in animation
  useEffect(() => {
    if (visible) {
      slideAnim.setValue(width);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 0,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: width,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };
  const router = useRouter();
  
  const handleLogout = async () => {
    try {
      await clearSavedToken();
      setUser(null);
      router.replace("/login")
    } catch (err) {
      console.log("Logout failed", err);
    }
  }

  return (
    
    <Modal transparent visible={visible} animationType="none">
      {/* Dimmed backdrop */}
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={{ flex: 1 }} onPress={handleClose} />
      </Animated.View>

      {/* Side panel */}
      <Animated.View
        style={[styles.menu, { transform: [{ translateX: slideAnim }] }]}
      >

        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              <Ionicons name="person-sharp" size={36} color="#0B36F4" />
            </View>
            <View style={styles.onlineDot} />
          </View>

          {loadingUser ? (
            <ActivityIndicator size="small" color="#0B36F4" style={{ marginTop: 12 }} />
          ) : (
            <>
              <Text style={styles.username}>{user?.username ?? "—"}</Text>
              <Text style={styles.email} numberOfLines={1}>{user?.email ?? ""}</Text>

              <View style={[styles.skillBadge, { borderColor: SKILL_COLOR }]}>
                <MaterialCommunityIcons name="volleyball" size={13} color={SKILL_COLOR} />
                <Text style={[styles.skillText, { color: SKILL_COLOR }]}>{SKILL_LEVEL}</Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.divider} />

        <View style={styles.menuItems}>
          <MenuItem icon="home" label="Home" active={pathname === "/home"}/>
          <MenuItem icon="person" label="Account" active={pathname === "/account"}/>
          <MenuItem icon="forum" label="Chat" active={pathname === "/chat"}/>
          <MenuItem icon="sports-volleyball" label="Activity Feed" active={pathname === "/activityFeed"}/>
          <MenuItem icon="info" label="About Us" active={pathname === "/aboutUs"}/>
        </View>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.logoutRow} onPress={() => setLogoutModalVisible(true)}>
          <View style={styles.logoutCircle}>
            <MaterialIcons name="logout" size={20} color="#EF4444" />
          </View>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </Animated.View>



      <Modal transparent visible={logoutModalVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Log Out</Text>
            <Text style={styles.modalText}>
              Are you sure you want to log out?
            </Text>

            <TouchableOpacity
              onPress={handleLogout}
              style={styles.logoutButton}
            >
              <Text style={styles.logoutButtonText}>Log Out</Text>
            </TouchableOpacity>

           
            <TouchableOpacity
              onPress={() => setLogoutModalVisible(false)}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

function MenuItem({icon, label, active}: {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  label: string;
  active?: boolean;
}) {
  return (
    <TouchableOpacity style={[styles.menuItem, active && styles.menuItemActive]}>
      <View style={styles.menuContent}>
        <View style={[styles.menuIconCircle, active && styles.menuIconCircleActive]}>
          <MaterialIcons name={icon} size={20} color={active ? "#FFFFFF" : "#0B36F4"} />
        </View>

        <Text style={[styles.menuLabel, active && styles.menuLabelActive]}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
  },

  menu: {
    position: "absolute",
    right: 0, 
    top: 0, 
    bottom: 0,
    width: "78%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderBottomLeftRadius: 32,
    paddingTop: 56,
    paddingHorizontal: 24,
    paddingBottom: 36,
    shadowColor: "#000",
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 12,
  },

  profileSection: {
    alignItems: "center",
    paddingBottom: 24,
  },

  avatarContainer: {
    position: "relative",
    marginBottom: 14,
  },

  avatarCircle: {
    width: 80, 
    height: 80,
    borderRadius: 40,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
  },

  onlineDot: {
    position: "absolute",
    bottom: 4, right: 4,
    width: 16, height: 16,
    borderRadius: 9,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  username: {
    fontSize: 24,
    fontFamily: "Lexend_700Bold",
    color: "#0F172A",
    marginBottom: 3,
  },

  email: {
    fontSize: 14,
    fontFamily: "Lexend_400Regular",
    color: "#94A3B8",
    marginBottom: 12,
    maxWidth: "90%",
  },

  skillBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1.5,
    backgroundColor: "#FFFBEB",
  },

  skillText: {
    fontSize: 12,
    fontFamily: "Lexend_600SemiBold",
  },

  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 8,
  },

  menuContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginLeft: 10,  
  },

  menuIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
  },

  menuIconCircleActive: {
    backgroundColor: "#0B36F4"
  },

  menuItems: {
    paddingVertical: 8,
    gap: 2,
  },

  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },

  menuItemActive: {
    backgroundColor: "#E7EBFE",
    borderRadius: 14,
  },

  menuLabel: {
    fontSize: 18,
    fontFamily: "Lexend_500Medium",
    color: "#4B5563",
  },

  menuLabelActive: {
    fontSize: 18,
    fontFamily: "Lexend_600SemiBold",
    color: "#0B36F4"
  },

  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 16,
    paddingHorizontal: 4,
    marginLeft: 10,
  },

  logoutCircle: {
    width: 40,
    height: 40,
    borderRadius: 18,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
  },

  logoutText: {
    fontSize: 18,
    fontFamily: "Lexend_600SemiBold",
    color: "#EF4444",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalCard: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },

  modalTitle: {
    fontSize: 18,
    fontFamily: "Lexend_700Bold",
    marginBottom: 10,
  },

  modalText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 22,
  },

  logoutButton: {
    backgroundColor: "#EF4444",
    width: "100%",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
    marginBottom: 12,
  },

  logoutButtonText: {
    color: "#fff",
    fontFamily: "Lexend_600SemiBold",
  },

  cancelButton: {
    backgroundColor: "#F1F5F9",
    width: "100%",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
  },

  cancelText: {
    color: "#64748B",
    fontFamily: "Lexend_500Regular",
  },
});