import { View, Text, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { r } from "@/utils/responsive";

type Props = {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  label: string;
};

export default function VenueInfoCard({ icon, label }: Props) {
  return (
    <View style={styles.card}>
      <MaterialIcons name={icon} size={r(20)} color="#0B36F4" />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F6F8",
    borderRadius: r(32),
    paddingHorizontal: r(14),
    paddingVertical: r(12),
    gap: r(8),
  },
  label: {
    fontSize: r(12),
    fontFamily: "Lexend_500Medium",
    color: "#334155",
    flexShrink: 1,
  },
});
