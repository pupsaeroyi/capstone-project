import { TextInput, StyleSheet, TextInputProps } from "react-native";

type InputProps = TextInputProps & {
  placeholder: string;
};

export function Input({ placeholder, style, ...props }: InputProps) {
  return (
    <TextInput
      style={[styles.input, style]}
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
    height: 52,
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 16,
    borderRadius: 8,
    fontSize: 15,
    borderWidth: 1,
    marginBottom: 12,
    borderColor: "#d0d0d0",
    textAlignVertical: "center",
    
  },
});
