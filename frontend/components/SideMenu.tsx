import { Modal, View, StyleSheet, TouchableOpacity, Animated, useWindowDimensions } from "react-native";
import { useEffect, useRef } from "react";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function SideMenu({ visible, onClose }: Props) {


  const { width } = useWindowDimensions();
  const slideAnim = useRef(new Animated.Value(width)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(width);
      Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 0,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      })
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: width,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      })
    ]).start(() => onClose());
  };

  return (
    <Modal transparent visible={visible} animationType="none">
     <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={{ flex: 1 }} onPress={handleClose} />
      </Animated.View>

      <Animated.View style={[styles.menu, { transform: [{ translateX: slideAnim }] }]}>
        {/* Your menu UI goes here */}
      </Animated.View>

    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
  },

  menu: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: "75%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 40,
    borderBottomLeftRadius: 40,
    padding: 20,
  },
});