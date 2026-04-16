import { View, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Ionicons } from "@expo/vector-icons";
import { r } from "@/utils/responsive";
import { useRouter } from "expo-router";
import MenuButton from "@/components/MenuButton";

type Props = {
  onFilterPress?: () => void;
};

export default function MapSearchBar({onFilterPress }: Props) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Ionicons name="chevron-back" size={28} color="#000" onPress={() => router.back()} />

        <View style={styles.searchPill}>
          <MaterialIcons name="search" size={r(20)} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search here"
            placeholderTextColor="#94A3B8"
          />
        </View>
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
    paddingTop: r(50),
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
