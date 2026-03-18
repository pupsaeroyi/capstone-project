import { TextInput, StyleSheet, TextInputProps, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type InputProps = TextInputProps & {
  placeholder: string;
  showSearchIcon?: boolean;
};

export function Input({ placeholder, style, showSearchIcon, ...props }: InputProps) {
  const { width } = useWindowDimensions();

  const height = width < 360 ? 44 : width < 420 ? 50 : 52;

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
          color="#878B94"
          style={styles.searchIcon}
        />
      )}

      <TextInput
        style={styles.input}
        autoComplete="off"
        placeholder={placeholder}
        placeholderTextColor="#878B94"
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
    backgroundColor: "#F3F4F6",
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
