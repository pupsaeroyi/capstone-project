import { TextInput, StyleSheet, TextInputProps, useWindowDimensions } from "react-native";

type InputProps = TextInputProps & {
  placeholder: string;
};

export function Input({ placeholder, style, ...props }: InputProps) {
  const { width } = useWindowDimensions();
  const height = width < 400 ? 48 : 56;

  return (
    <TextInput
      style={[styles.input, {height}, style]}
      autoComplete="off"
      placeholder={placeholder}
      placeholderTextColor="#999"
      autoCorrect={false}
      autoCapitalize="none"
      showSoftInputOnFocus
      {...props}
      
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 16,
    borderRadius: 12,
    fontSize: 15,
    borderWidth: 1,
    marginBottom: 12,
    borderColor: "#d0d0d0",
    textAlignVertical: "center",
    
  },
});
