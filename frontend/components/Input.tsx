import { TextInput, StyleSheet, TextInputProps, View, ViewStyle, TextStyle, StyleProp, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { r } from "@/utils/responsive";

type InputProps = Omit<TextInputProps, "style"> & {
  placeholder: string;
  showSearchIcon?: boolean;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
};

export function Input({ placeholder, style, inputStyle, showSearchIcon, ...props }: InputProps) {
  
  const height = Platform.OS === "web" ? 50 : r(44);

  return (
    <View
      style={[
        styles.inputWrapper,
        {
          height,
          borderRadius: height / 2,
        },
        style,
      ]}
    >
      {showSearchIcon && (
        <Ionicons
          name="search"
          size={20}
          color="#94A3B8"
          style={styles.searchIcon}
        />
      )}

      <TextInput
        style={[styles.input, inputStyle]}
        autoComplete="off"
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        autoCorrect={false}
        autoCapitalize="none"
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "transparent",
    paddingHorizontal: 15,
    flex: 1,
  },

  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Lexend_400Regular",
    padding: 0,
  },

  searchIcon: {
    marginRight: 10,
  },
});
