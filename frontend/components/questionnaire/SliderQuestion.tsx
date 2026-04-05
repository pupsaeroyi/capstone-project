import { View, Text, StyleSheet } from "react-native";
import Slider from "@react-native-community/slider";

type Props = {
  config: {
    question: string;
    subtitle?: string;
    min: number;
    max: number;
  };
  value: number;
  onChange: (v: number) => void;
};

export function SliderQuestion({ config, value, onChange }: Props) {
  const ticks = Array.from(
    { length: config.max - config.min + 1 },
    (_, i) => i + config.min
  );

  return (
    <View style={styles.container}>
      <Text style={styles.question}>{config.question}</Text>
      {config.subtitle && (
        <Text style={styles.subtitle}>{config.subtitle}</Text>
      )}

      <View style={styles.card}>
        <View style={styles.labelRow}>
          <Text style={styles.endLabel}>NOVICE</Text>
          <Text style={styles.endLabel}>EXPERT</Text>
        </View>

        <Slider
          style={styles.slider}
          minimumValue={config.min}
          maximumValue={config.max}
          step={1}
          value={value}
          onValueChange={onChange}
          minimumTrackTintColor="#0B36F4"
          maximumTrackTintColor="#E2E8F0"
          thumbTintColor="#0B36F4"
        />

        <View style={styles.tickRow}>
          {ticks.map((t) => (
            <Text key={t} style={[styles.tick, t === value && styles.tickActive]}>
              {t}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: "6%",
    paddingTop: 24,
  },
  question: {
    fontSize: 24,
    fontFamily: "Lexend_700Bold",
    color: "#0F172A",
    marginBottom: 8,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Lexend_400Regular",
    color: "#64748B",
    marginBottom: 32,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    padding: 20,
    paddingVertical: 32,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  endLabel: {
    fontSize: 11,
    fontFamily: "Lexend_600SemiBold",
    color: "#94A3B8",
    letterSpacing: 1,
  },
  slider: {
    width: "100%",
    height: 40,
    paddingTop: 30,
    paddingBottom: 30,
  },
  tickRow: {
    flexDirection: "row",
    marginTop: 4,
    paddingHorizontal: 2,
  },
  tick: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontFamily: "Lexend_400Regular",
    color: "#94A3B8",
  },
  tickActive: {
    color: "#0B36F4",
    fontFamily: "Lexend_700Bold",
  },
});