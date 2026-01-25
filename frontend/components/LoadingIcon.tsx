import { Animated, Easing } from "react-native";
import { useEffect, useRef } from "react";
import { AntDesign } from "@expo/vector-icons";

type LoadingIconProps = {
  size?: number;
  color?: string;
};

export default function LoadingIcon({
  size = 22,
  color = "#999",
}: LoadingIconProps) {
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    spinValue.setValue(0);

    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View style={{ transform: [{ rotate: spin }] }}>
      <AntDesign name="loading-3-quarters" size={size} color={color} />
    </Animated.View>
  );
}
