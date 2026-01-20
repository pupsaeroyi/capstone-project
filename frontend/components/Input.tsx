import { TextInput, StyleSheet } from 'react-native';

interface InputProps {
  placeholder: string;
  value?: string;
  onChangeText?: (text: string) => void;
  secureTextEntry?: boolean;
}

export function Input({ placeholder, value, onChangeText, secureTextEntry }: InputProps) {
  return (
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      placeholderTextColor="#999"
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={secureTextEntry}
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