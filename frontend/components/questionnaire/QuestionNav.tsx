import { View, StyleSheet } from "react-native";
import { Button } from "@/components/Button";
import { TouchableOpacity, Text } from "react-native";

type Props = {
  onBack?: () => void;
  onNext: () => void;
  isLast: boolean;
  disabled: boolean;
  loading?: boolean;
};

export function QuestionNav({ onBack, onNext, isLast, disabled, loading }: Props) {
  return (
    <View style={styles.container}>
      {onBack && (
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      )}
      <View style={styles.nextWrapper}>
        <Button
          title={loading ? "Submitting..." : isLast ? "Submit" : "Next"}
          onPress={onNext}
          disabled={disabled}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: "6%",
    paddingBottom: 36,
    paddingTop: 16,
    gap: 14,
  },
  backButton: {
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  backText: {
    fontSize: 18,
    fontFamily: "Lexend_500Medium",
    color: "#0F172A",
  },

  nextWrapper: {
    flex: 1,
  },
});