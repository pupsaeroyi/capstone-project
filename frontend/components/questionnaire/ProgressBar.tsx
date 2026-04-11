import { View, Text, StyleSheet } from "react-native";

type Props = {
  progress: number;
  step: number;
  total: number;
};

export function ProgressBar({ progress, step, total }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.Questionlabel}>Question {step + 1} of {total}</Text>
        <Text style={styles.Percentagelabel}>{Math.round(progress)}% Complete</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: "6%",
    paddingTop: 16,
    paddingBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  Questionlabel: {
    fontSize: 14,
    fontFamily: "Lexend_500Medium",
    color: "#0F172A",
  },
  
  Percentagelabel: {
    fontSize: 14,
    fontFamily: "Lexend_400Regular",
    color: "#64748B",
  },
  track: {
    height: 8,
    backgroundColor: "#E2E8F0",
    borderRadius: 999,
    overflow: "hidden",
  },
  fill: {
    height: 8,
    backgroundColor: "#0B36F4",
    borderRadius: 999,
  },
});