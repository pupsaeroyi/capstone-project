import { useRef, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated, Dimensions } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { r } from "@/utils/responsive";

const SCREEN_HEIGHT = Dimensions.get("window").height;

export type FilterState = {
  skill: "all" | "beginner" | "intermediate" | "advanced" | "pro";
  when: "any" | "today" | "tomorrow" | "week";
};

type Props = {
  visible: boolean;
  value: FilterState;
  onChange: (v: FilterState) => void;
  onClose: () => void;
};

const SKILL_OPTIONS: { value: FilterState["skill"]; label: string }[] = [
  { value: "all", label: "All" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "pro", label: "Pro" },
];

const WHEN_OPTIONS: { value: FilterState["when"]; label: string }[] = [
  { value: "any", label: "Any time" },
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "week", label: "This week" },
];

export function FilterSheet({ visible, value, onChange, onClose }: Props) {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      translateY.setValue(SCREEN_HEIGHT);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
        speed: 14,
      }).start();
    }
  }, [visible, translateY]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />

      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        {/* Drag handle */}
        <View style={styles.handleBar}>
          <View style={styles.handle} />
        </View>

        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>Filters</Text>
          <TouchableOpacity onPress={onClose} activeOpacity={0.6}>
            <MaterialIcons name="close" size={r(22)} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Skill level */}
        <Text style={styles.sectionLabel}>Skill level</Text>
        <View style={styles.chipRow}>
          {SKILL_OPTIONS.map((opt) => {
            const active = value.skill === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => onChange({ ...value, skill: opt.value })}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* When */}
        <Text style={styles.sectionLabel}>When</Text>
        <View style={styles.chipRow}>
          {WHEN_OPTIONS.map((opt) => {
            const active = value.when === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => onChange({ ...value, when: opt.value })}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Apply */}
        <TouchableOpacity
          style={styles.applyButton}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Text style={styles.applyText}>Apply</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: r(24),
    borderTopRightRadius: r(24),
    paddingHorizontal: r(20),
    paddingBottom: r(32),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  handleBar: {
    alignItems: "center",
    paddingVertical: r(10),
  },
  handle: {
    backgroundColor: "#E2E8F0",
    width: r(48),
    height: r(5),
    borderRadius: r(3),
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: r(8),
  },
  title: {
    fontSize: r(18),
    fontFamily: "Lexend_700Bold",
    color: "#0F172A",
  },
  sectionLabel: {
    fontSize: r(13),
    fontFamily: "Lexend_600SemiBold",
    color: "#64748B",
    marginTop: r(14),
    marginBottom: r(8),
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: r(8),
  },
  chip: {
    paddingHorizontal: r(14),
    paddingVertical: r(8),
    borderRadius: r(16),
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chipActive: {
    backgroundColor: "#0B36F4",
    borderColor: "#0B36F4",
  },
  chipText: {
    fontSize: r(13),
    fontFamily: "Lexend_500Medium",
    color: "#475569",
  },
  chipTextActive: {
    color: "#FFFFFF",
    fontFamily: "Lexend_600SemiBold",
  },
  applyButton: {
    marginTop: r(22),
    backgroundColor: "#0B36F4",
    paddingVertical: r(14),
    borderRadius: r(14),
    alignItems: "center",
  },
  applyText: {
    color: "#FFFFFF",
    fontFamily: "Lexend_600SemiBold",
    fontSize: r(15),
  },
});
