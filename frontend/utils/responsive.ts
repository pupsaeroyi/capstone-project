import { Dimensions } from "react-native";

const { width } = Dimensions.get("window");

const BASE_WIDTH = 390;

export const r = (size: number) => {
  const scale = width / BASE_WIDTH;
  const dampened = 1 + (scale - 1) * 0.5;
  return Math.round(size * dampened);
};