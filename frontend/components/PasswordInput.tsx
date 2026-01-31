import { useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Input } from "@/components/Input";
import AntDesign from "@expo/vector-icons/AntDesign";

type Props = React.ComponentProps<typeof Input>;

export function PasswordInput({ style, ...props }: Props) {
  const [show, setShow] = useState(false);

  return (
    <View style={[styles.wrapper]}>
      <Input
        {...props}
        secureTextEntry={!show}
        style={[styles.input, style]}
      />

      <Pressable
        onPress={() => setShow((s) => !s)}
        style={styles.iconBtn}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={show ? "Hide password" : "Show password"}
      >
        <AntDesign name={show ? "eye" : "eye-invisible"} size={18} color="#666" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    width: "100%",
  },
  input: {
    paddingRight: 44, 
  },
	
  iconBtn: {
    position: "absolute",
    right: 14,
    top: 0,
    bottom: 12,
    justifyContent: "center",
    alignItems: "center",
  },
});
