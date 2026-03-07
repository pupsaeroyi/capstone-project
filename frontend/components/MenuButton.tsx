import { TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

type Props = {
  onPress?: () => void;
};

export default function MenuButton({ onPress }: Props) {
    return (
        <TouchableOpacity onPress={onPress}>
            <Feather name="menu" size={24} color="#0F172A" />
        </TouchableOpacity>
    );
}


    
