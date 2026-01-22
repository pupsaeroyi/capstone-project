import { TextInput, StyleSheet, TextInputProps } from 'react-native';

type InputProps = TextInputProps & {
  placeholder: string;
};

export function Input({ placeholder, style, ...props }: InputProps) {
  return (
    <TextInput
      style={[styles.input, style]}
      placeholder={placeholder}
      placeholderTextColor="#999"

      // ✅ Fix Android issue where keyboard doesn't appear
      showSoftInputOnFocus={true}

      // ✅ Good defaults for forms
      autoCorrect={false}
      autoCapitalize="none"

      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    fontSize: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#d0d0d0',
  },
});
