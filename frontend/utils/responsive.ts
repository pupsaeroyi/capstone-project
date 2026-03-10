import { Dimensions } from "react-native";

const { width } = Dimensions.get("window");

// iPhone 13 as baseline
const BASE_WIDTH = 375;

export const r = (size: number) => {
  const scale = width / BASE_WIDTH;
  return Math.round(size * scale);
};