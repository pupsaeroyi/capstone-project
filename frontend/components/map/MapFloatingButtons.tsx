import { View, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { r } from "@/utils/responsive";

type Props = {
  onLayersPress?: () => void;
  onMyLocationPress: () => void;
  bottomSheetOpen?: boolean;
};

export default function MapFloatingButtons({ onLayersPress, onMyLocationPress, bottomSheetOpen }: Props) {
  return (
    <View style={[styles.container, bottomSheetOpen && styles.containerShifted]}>
      <TouchableOpacity style={styles.fab} onPress={onLayersPress}>
        <MaterialIcons name="layers" size={r(22)} color="#334155" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.fab} onPress={onMyLocationPress}>
        <MaterialIcons name="my-location" size={r(22)} color="#0B36F4" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: r(16),
    bottom: r(140),
    gap: r(12),
    zIndex: 10,
  },
  containerShifted: {
    bottom: r(340),
  },
  fab: {
    width: r(44),
    height: r(44),
    borderRadius: r(22),
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
});
