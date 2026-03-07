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
  <View style={styles.inputWrapper}>
    
    {showSearchIcon && (
      <Ionicons
        name="search"
        size={20}
        color="#878B94"
        style={styles.searchIcon}
      />
    )}

    <TextInput
      style={[
        styles.input,
        {
          height,
          borderRadius: height / 2,
          paddingLeft: showSearchIcon ? 40 : 20, 
        },
        style,
      ]}
      
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
    position: "relative",
    justifyContent: "center",
    flex: 1,
  },

  input: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 20,
    fontSize: 15,
    borderWidth: 1, 
    borderColor: "transparent",
    fontFamily: "Lexend_400Regular",
  },

  searchIcon: {
    position: "absolute",
    left: 15,
    zIndex: 1,
    transform: [{ translateY: -15 }],
  },
});