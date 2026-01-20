import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface ButtonProps {
    title: string;
    onPress: () => void;
}

export function Button({ title, onPress }: ButtonProps) {
    return (
        <TouchableOpacity style={styles.button} onPress={onPress}>
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
    text: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});