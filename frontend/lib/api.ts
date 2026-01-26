import { Platform } from "react-native";

export const LOCAL_API =
  Platform.OS === "android"
    ? "http://10.0.2.2:3000"
    : "http://localhost:3000";

const PROD_API = "https://capstone-project-t6ye.onrender.com";

export const API_BASE = PROD_API; // force prod
