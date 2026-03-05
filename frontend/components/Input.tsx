import { TextInput, StyleSheet, TextInputProps, useWindowDimensions } from "react-native";

type InputProps = TextInputProps & {
  placeholder: string;
};

export function Input({ placeholder, style, ...props }: InputProps) {
  const { width } = useWindowDimensions();

  const height = width < 360 ? 44 : width < 420 ? 50 : 52;

  return (
    <TextInput
      style={[
        styles.input,
        {
          height,
          borderRadius: height / 2, 
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
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: "#F3F4F6", 
    paddingHorizontal: 20,
    fontSize: 15,
    borderWidth: 0, 
    marginBottom: 16,
    fontFamily: "Lexend_400Regular",
  },
});