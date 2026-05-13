import React from "react";
import { Tabs } from "expo-router";
import { Colors } from "../../theme/colors"; // Ensure this matches your path
import { Home, ShoppingBasket, ChefHat, User } from "lucide-react-native";
import { History } from "lucide-react-native"; // Add this to your imports

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#000", // Active icon color
        tabBarInactiveTintColor: "#BBB", // Inactive icon color
        headerShown: false, // Hide the top header globally
        tabBarStyle: {
          backgroundColor: "#FFF",
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: "#000",
          shadowOpacity: 0.1,
          shadowRadius: 10,
          height: 85,
          paddingBottom: 25,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="pantry"
        options={{
          title: "Pantry",
          tabBarIcon: ({ color }) => <ShoppingBasket size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="cook"
        options={{
          title: "Cook",
          tabBarIcon: ({ color }) => <ChefHat size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="activities"
        options={{
          title: "History",
          tabBarIcon: ({ color }) => <History size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
