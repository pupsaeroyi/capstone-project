import { Modal, View, Text, StyleSheet, TouchableOpacity, Animated, useWindowDimensions, Alert } from "react-native";
import { useEffect, useRef, useState } from "react";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { clearSavedToken } from "@/lib/auth";
import { authFetch } from "@/lib/api";
import { r } from "@/utils/responsive";

type Props = {
  visible: boolean;
  onClose: () => void;
};

const APP_VERSION = "1.0.0";

export default function AccountSettings({ visible, onClose }: Props) {
  const { width } = useWindowDimensions();
  const slideAnim = useRef(new Animated.Value(width)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const { user, setUser } = useAuth();

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

  const handleNavigate = (route: any) => {
    handleClose();
    setTimeout(() => router.push(route), 200);
  };

  const handleLogout = async () => {
    await clearSavedToken();
    setUser(null);
    setLogoutModalVisible(false);
    router.replace("/login");
  };

  const handleDeleteAccount = async () => {
    try {
      setDeleting(true);
      const data = await authFetch("/auth/delete-account", { method: "DELETE" });
      if (data.ok) {
        await clearSavedToken();
        setUser(null);
        setDeleteModalVisible(false);
        router.replace("/login");
      } else {
        Alert.alert("Error", data.message || "Failed to delete account.");
      }
    } catch {
      Alert.alert("Error", "Cannot connect to server.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal transparent visible={visible} animationType="none">
      {/* Backdrop */}
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={{ flex: 1 }} onPress={handleClose} />
      </Animated.View>

      {/* Panel */}
      <Animated.View style={[styles.panel, { transform: [{ translateX: slideAnim }] }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Ionicons name="close" size={r(22)} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        {/* Account section */}
        <Text style={styles.sectionLabel}> Account</Text>
        <View style={styles.section}>
          <SettingRow
            icon="lock"
            label="Change password"
            onPress={() => handleNavigate("/change-password")}
          />
          <SettingRow
            icon="mail"
            label="Change email"
            onPress={() => handleNavigate("/change-email")}
          />
        </View>

        {/* App section */}
        <Text style={styles.sectionLabel}> App</Text>
        <View style={styles.section}>
          <SettingRow
            icon="info"
            label="About"
            subtitle={`Version ${APP_VERSION}`}
          />
        </View>

        {/* Danger zone */}
        <Text style={styles.sectionLabel}> Danger zone</Text>
        <View style={styles.section}>
          <SettingRow
            icon="delete-outline"
            label="Delete account"
            danger
            onPress={() => setDeleteModalVisible(true)}
          />
        </View>
        

        {/* Logout */}
        <Text style={styles.sectionLabel}> Log out</Text>
        <View style={[styles.section, { marginTop: 4 }]}>
          <SettingRow
            icon="logout"
            label="Log out"
            danger
            onPress={() => setLogoutModalVisible(true)}
          />
        </View>
      </Animated.View>

      {/* Logout confirm modal */}
      <ConfirmModal
        visible={logoutModalVisible}
        title="Log out"
        message="Are you sure you want to log out?"
        confirmLabel="Log out"
        onConfirm={handleLogout}
        onCancel={() => setLogoutModalVisible(false)}
      />

      {/* Delete confirm modal */}
      <ConfirmModal
        visible={deleteModalVisible}
        title="Delete account"
        message="This will permanently delete your account and all your data. This cannot be undone."
        confirmLabel={deleting ? "Deleting..." : "Delete account"}
        onConfirm={handleDeleteAccount}
        onCancel={() => setDeleteModalVisible(false)}
        disabled={deleting}
      />
    </Modal>
  );
}

function SettingRow({
  icon,
  label,
  subtitle,
  danger = false,
  onPress,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  label: string;
  subtitle?: string;
  danger?: boolean;
  onPress?: () => void;
}) {
  const color = danger ? "#EF4444" : "#0B36F4";
  const bgColor = danger ? "#FEF2F2" : "#F3F5FE";

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconCircle, { backgroundColor: bgColor }]}>
        <MaterialIcons name={icon} size={r(20)} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, danger && { color: "#EF4444" }]}>{label}</Text>
        {subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={r(16)} color="#64748B" />
    </TouchableOpacity>
  );
}

function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  disabled = false,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  disabled?: boolean;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalMessage}>{message}</Text>
          <TouchableOpacity
            style={[styles.confirmBtn, disabled && { opacity: 0.5 }]}
            onPress={onConfirm}
            disabled={disabled}
          >
            <Text style={styles.confirmBtnText}>{confirmLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
  },

  panel: {
    position: "absolute",
    right: 0, top: 0, bottom: 0,
    width: "78%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: r(32),
    borderBottomLeftRadius: r(32),
    paddingTop: r(56),
    paddingHorizontal: r(20),
    paddingBottom: r(36),
    shadowColor: "#000",
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 12,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: r(32),
    gap: r(12),
  },

  closeBtn: {
    padding: r(4),
  },

  headerTitle: {
    fontSize: r(20),
    fontFamily: "Lexend_700Bold",
    color: "#0F172A",
  },

  sectionLabel: {
    fontSize: r(11),
    fontFamily: "Lexend_700Bold",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: r(8),
    marginLeft: r(4),
  },

  section: {
    backgroundColor: "#fff",
    borderRadius: r(16),
    marginBottom: r(20),
    overflow: "hidden",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: r(14),
    paddingVertical: r(14),
    paddingHorizontal: r(14),
  },

  rowDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginLeft: r(62),
  },

  iconCircle: {
    width: r(40),
    height: r(40),
    borderRadius: r(20),
    justifyContent: "center",
    alignItems: "center",
  },

  rowLabel: {
    fontSize: r(15),
    fontFamily: "Lexend_500Medium",
    color: "#0F172A",
  },

  rowSubtitle: {
    fontSize: r(12),
    fontFamily: "Lexend_400Regular",
    color: "#94A3B8",
    marginTop: 1,
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
    borderRadius: r(20),
    padding: r(24),
    alignItems: "center",
  },

  modalTitle: {
    fontSize: r(18),
    fontFamily: "Lexend_700Bold",
    color: "#0F172A",
    marginBottom: r(8),
  },

  modalMessage: {
    fontSize: r(14),
    fontFamily: "Lexend_400Regular",
    color: "#64748B",
    textAlign: "center",
    marginBottom: r(22),
    lineHeight: r(20),
  },

  confirmBtn: {
    backgroundColor: "#EF4444",
    width: "100%",
    alignItems: "center",
    paddingVertical: r(13),
    borderRadius: r(18),
    marginBottom: r(10),
  },

  confirmBtnText: {
    color: "#fff",
    fontFamily: "Lexend_600SemiBold",
    fontSize: r(15),
  },

  cancelBtn: {
    backgroundColor: "#F1F5F9",
    width: "100%",
    alignItems: "center",
    paddingVertical: r(13),
    borderRadius: r(18),
  },

  cancelBtnText: {
    color: "#64748B",
    fontFamily: "Lexend_500Medium",
    fontSize: r(15),
  },
});