import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";

type Option = { label: string; subtitle?: string };

type Props = {
  config: {
    question: string;
    subtitle?: string;
    options: Option[];
  };
  value: string;
  onChange: (v: string) => void;
  isDisabledOption?: (label: string) => boolean;
};

export function RadioQuestion({ config, value, onChange, isDisabledOption}: Props) {
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.question}>{config.question}</Text>
      {config.subtitle && (
        <Text style={styles.subtitle}>{config.subtitle}</Text>
      )}
      <View style={styles.options}>
        {config.options.map((opt) => {
          const selected = value === opt.label;
          const disabled = isDisabledOption?.(opt.label);

          return (
            <TouchableOpacity
              key={opt.label}
              style={[
                styles.option,
                selected && styles.optionSelected,
                disabled && styles.optionDisabled
              ]}
              onPress={() => !disabled && onChange(opt.label)}
              activeOpacity={0.7}
              disabled={disabled}
            >
              <View style={styles.optionLeft}>
                <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                  {opt.label}
                </Text>
                {opt.subtitle && (
                  <Text style={[styles.optionSub, selected && styles.optionSubSelected]}>
                    {opt.subtitle}
                  </Text>
                )}
              </View>
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: "6%",
    paddingTop: 24,
    paddingBottom: 24,
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
  },
  options: {
    gap: 10,
    marginTop: 24,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  optionSelected: {
    borderColor: "#0B36F4",
    backgroundColor: "#EEF2FF",
  },

  optionDisabled: {
    opacity: 0.4,
  },

  optionLeft: {
    flex: 1,
    marginRight: 12,
  },
  optionLabel: {
    fontSize: 15,
    fontFamily: "Lexend_500Medium",
    color: "#0F172A",
  },
  optionLabelSelected: {
    color: "#0B36F4",
  },
  optionSub: {
    fontSize: 12,
    fontFamily: "Lexend_400Regular",
    color: "#94A3B8",
    marginTop: 2,
  },
  optionSubSelected: {
    color: "#6B8EF5",
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    borderColor: "#0B36F4",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#0B36F4",
  },
});