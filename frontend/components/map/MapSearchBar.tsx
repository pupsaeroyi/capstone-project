import { View, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { r } from "@/utils/responsive";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  onMenuPress: () => void;
  onFilterPress?: () => void;
};

export default function MapSearchBar({ onMenuPress, onFilterPress }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + r(8) }]}>
      <View style={styles.row}>
        <TouchableOpacity style={styles.iconButton} onPress={onMenuPress}>
          <MaterialIcons name="menu" size={r(20)} color="#334155" />
        </TouchableOpacity>

        <View style={styles.searchPill}>
          <MaterialIcons name="search" size={r(20)} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search here"
            placeholderTextColor="#94A3B8"
          />
        </View>

        <TouchableOpacity style={styles.iconButton} onPress={onFilterPress}>
          <MaterialIcons name="tune" size={r(20)} color="#334155" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: r(16),
    paddingBottom: r(12),
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: r(10),
  },
  iconButton: {
    width: r(34),
    height: r(34),
    borderRadius: r(17),
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: r(20),
    paddingHorizontal: r(14),
    height: r(40),
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: r(8),
  },
  searchInput: {
    flex: 1,
    fontSize: r(14),
    fontFamily: "Lexend_400Regular",
    color: "#0F172A",
    padding: 0,
  },
});
