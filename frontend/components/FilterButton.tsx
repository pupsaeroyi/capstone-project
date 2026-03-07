import { StyleSheet, TouchableOpacity, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export function FilterButton({ onPress }: { onPress?: () => void }) {
  const { width } = useWindowDimensions();
  const height = width < 360 ? 44 : width < 420 ? 50 : 52;

  return (
    <TouchableOpacity
      style={[styles.button, { width: height, height, borderRadius: height / 2 }]}
      onPress={onPress}
    >
      <Ionicons name="options-outline" size={20} color="#0B36F4" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
});