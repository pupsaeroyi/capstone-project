import { View, Text, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { MarkerVariant } from "@/types/venue";
import { r } from "@/utils/responsive";

type Props = {
  variant: MarkerVariant;
  activeCount?: number;
};

export default function MapMarker({ variant, activeCount = 0 }: Props) {
  if (variant === "inactive") {
    return (
      <View style={styles.inactiveContainer}>
         <MaterialIcons name="sports-volleyball" size={r(8)} color="#94A3B8" />
      </View>
    );
  }

  if (variant === "selected") {
    return (
      <View style={styles.selectedContainer}>
        <View style={styles.selectedShadow} />
        <View style={styles.selectedPin}>
          <MaterialIcons name="location-on" size={r(28)} color="#FFFFFF" />
        </View>
      </View>
    );
  }

  // active variant
  return (
    <View style={styles.activeContainer}>
      <View style={styles.activePin}>
        <MaterialIcons name="sports-volleyball" size={r(18)} color="#FFFFFF" />
      </View>
      {activeCount > 0 && (
        <View style={styles.activeBadge}>
          <Text style={styles.activeBadgeText}>{activeCount} Active</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Inactive — Google-Maps-style white pin dot
  inactiveContainer: {
    width: r(22),
    height: r(22),
    borderRadius: r(11),
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  // Selected
  selectedContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: r(56),
    height: r(64),
  },
  selectedShadow: {
    position: "absolute",
    bottom: r(2),
    width: r(36),
    height: r(36),
    borderRadius: r(18),
    backgroundColor: "#B5C2FB",
    opacity: 0.4,
  },
  selectedPin: {
    width: r(44),
    height: r(44),
    borderRadius: r(22),
    backgroundColor: "#0B36F4",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0B36F4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  // Active
  activeContainer: {
    alignItems: "center",
  },
  activePin: {
    width: r(36),
    height: r(36),
    borderRadius: r(18),
    backgroundColor: "#0B36F4",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0B36F4",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  activeBadge: {
    marginTop: r(4),
    backgroundColor: "#0B36F4",
    paddingHorizontal: r(8),
    paddingVertical: r(2),
    borderRadius: r(10),
  },
  activeBadgeText: {
    color: "#FFFFFF",
    fontSize: r(10),
    fontFamily: "Lexend_600SemiBold",
  },
});
