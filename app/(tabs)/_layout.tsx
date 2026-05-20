import React from "react";
import { Tabs } from "expo-router";
import { Colors } from "../../theme/colors";
import { CustomTabBar } from "../../components/navbar/CustomTabBar";

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
        }}
      />

      <Tabs.Screen
        name="pantry"
        options={{
          title: "Pantry",
        }}
      />

      <Tabs.Screen
        name="cook"
        options={{
          title: "Add",
        }}
      />

      <Tabs.Screen
        name="activities"
        options={{
          title: "History",
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
        }}
      />
    </Tabs>
  );
}
 
