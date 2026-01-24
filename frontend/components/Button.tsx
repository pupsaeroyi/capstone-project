import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface ButtonProps {
    title: string;
    onPress: () => void;
    disabled?: boolean;
}

export function Button({ title, onPress, disabled = false }: ButtonProps) {
    return (
        <TouchableOpacity 
            style={[styles.button, disabled && styles.disabled]} 
            onPress={onPress}
            disabled={disabled}>
            <Text style={styles.text}>{title}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        backgroundColor: '#000',
        paddingVertical: 16,
        paddingHorizontal: 40,
        borderRadius: 25,
        alignItems: 'center',
        width: '100%',
        marginVertical: 10,
    },
    disabled: {
        opacity: 0.5,
    },
    text: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});