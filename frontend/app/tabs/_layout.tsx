import { Tabs, useRouter } from "expo-router";
import { MaterialIcons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { r } from "@/utils/responsive";

function CreateSessionButton({onPress}: {onPress: () => void}) {
	return (
		<TouchableOpacity onPress={onPress} style={styles.createButton}>
			<View style={styles.createButtonInner}>
				<Feather name="plus" size={26} color="#fff" />
			</View>
		</TouchableOpacity>
	);
}

export default function TabsLayout() {
	const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0B36F4",
				
    		tabBarStyle: {
					backgroundColor: "#fff",
					borderColor: "#F1F5F9",
					borderTopWidth: 0,
					borderWidth: 1,
					elevation: 10,
					shadowColor: "#000",
					shadowOffset: { width: 0, height: -4 },
					shadowOpacity: 0.06,
					shadowRadius: 12,
					height: 70,
					borderTopLeftRadius: 24,   
					borderTopRightRadius: 24, 
					position: "absolute",
					left: 0,                   
					right: 0,                  
					bottom: 0,                 
					paddingTop: 8,
				},

				tabBarLabelStyle: {
					fontSize: 10,
					fontFamily: "Lexend_600SemiBold",
				},
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="home" size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="community"
        options={{
          title: "Social",
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="people" size={26} color={color} />
          ),
        }}
      />


			<Tabs.Screen
        name="create"
        options={{
          title: "",
          tabBarLabel: () => null,
          tabBarIcon: () => null,
          tabBarButton: () => (
            <CreateSessionButton onPress={() => router.push("/create-session")} />
          ),
        }}
      />

			<Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="chat" size={24} color={color} />
          ),
        }}
      />

			<Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="person" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}


const styles = StyleSheet.create({
  createButton: {
    flex: 1,
    top: -10,
    justifyContent: "center",
    alignItems: "center",
  },

  createButtonInner: {
    width: r(56),
    height: r(56),
    borderRadius: r(28),
    backgroundColor: "#0B36F4",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0B36F4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});