import { Modal, View, Text, StyleSheet, TouchableOpacity, Animated, useWindowDimensions, ActivityIndicator } from "react-native";
import { useEffect, useRef, useState } from "react";
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { clearSavedToken } from "@/lib/auth";
import { API_BASE } from "@/lib/api";
import { useRouter, usePathname, Href} from "expo-router";
import { r } from "@/utils/responsive";
import { useAuth } from "@/context/AuthContext";

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
  const [loadingUser, setLoadingUser] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, setUser } = useAuth();


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
  
  const handleNavigate = (route: Href) => {
    handleClose();
    setTimeout(() => {
      router.push(route);
    }, 200);
  };

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
              <Ionicons name="person-sharp" size={r(36)} color="#0B36F4" />
            </View>
            <View style={styles.onlineDot} />
          </View>

          {loadingUser ? (
            <ActivityIndicator size="small" color="#0B36F4" style={{ marginTop: r(12) }} />
          ) : (
            <>
              <Text style={styles.username}>{user?.username ?? "Player"}</Text>
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
          <MenuItem icon="home" label="Home" active={pathname === "/home"} onPress={() => handleNavigate("/home")}/>
          <MenuItem icon="map" label="Map" active={pathname === "/map"} onPress={() => handleNavigate("/map")}/>
          <MenuItem icon="person" label="Account" active={pathname === "/account"} onPress={() => handleNavigate("/account")}/>
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

function MenuItem({icon, label, active, onPress}: {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {

  return (
    <TouchableOpacity onPress={onPress} style={[styles.menuItem, active && styles.menuItemActive]}>
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
    borderTopLeftRadius: r(32),
    borderBottomLeftRadius: r(32),
    paddingTop: r(56),
    paddingHorizontal: r(24),
    paddingBottom: r(36),
    shadowColor: "#000",
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 12,
  },

  profileSection: {
    alignItems: "center",
    paddingBottom: r(24),
  },

  avatarContainer: {
    position: "relative",
    marginBottom: r(14),
  },

  avatarCircle: {
    width: r(80),
    height: r(80),
    borderRadius: r(40),
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
  },

  onlineDot: {
    position: "absolute",
    bottom: r(4),
    right: r(4),
    width: r(16),
    height: r(16),
    borderRadius: r(8),
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  username: {
    fontSize: r(24),
    fontFamily: "Lexend_700Bold",
    color: "#0F172A",
    marginBottom: 4,
  },

  email: {
    fontSize: r(16),
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
    gap: r(14),
    marginLeft: r(10),  
  },

  menuIconCircle: {
    width: r(40),
    height: r(40),
    borderRadius: r(20),
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
  },

  menuIconCircleActive: {
    backgroundColor: "#0B36F4"
  },

  menuItems: {
    gap: r(6),
  },

  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: r(14),
    paddingVertical: r(10),
    paddingHorizontal: r(6),
  },

  menuItemActive: {
    backgroundColor: "#E7EBFE",
    borderRadius: r(16),
  },

  menuLabel: {
    fontSize: r(16),
    fontFamily: "Lexend_500Medium",
    color: "#4B5563",
  },

  menuLabelActive: {
    fontSize: r(16),
    fontFamily: "Lexend_600SemiBold",
    color: "#0B36F4"
  },

  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: r(12),
    paddingTop: r(16),
    paddingHorizontal: 4,
    marginLeft: r(10),
  },

  logoutCircle: {
    width: r(40),
    height: r(40),
    borderRadius: r(20),
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
  },

  logoutText: {
    fontSize: r(16),
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
    borderRadius: r(16),
    padding: r(24),
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },

  modalTitle: {
    fontSize: r(18),
    fontFamily: "Lexend_700Bold",
    marginBottom: r(10),
  },

  modalText: {
    fontSize: r(14),
    color: "#64748B",
    textAlign: "center",
    marginBottom: r(22),
  },

  logoutButton: {
    backgroundColor: "#EF4444",
    width: "100%",
    alignItems: "center",
    paddingVertical: r(12),
    paddingHorizontal: r(16),
    borderRadius: r(18),
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