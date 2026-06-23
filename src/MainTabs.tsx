import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";
import { Text } from "react-native";
import { CartButton } from "./components/HeaderButtons";
import type { TabParamList } from "./navigation";
import { AccountScreen } from "./screens/AccountScreen";
import { CategoriesScreen } from "./screens/CategoriesScreen";
import { EstimerScreen } from "./screens/EstimerScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { colors } from "./theme";

const Tab = createBottomTabNavigator<TabParamList>();

const icon = (emoji: string) => () =>
  <Text style={{ fontSize: 20 }}>{emoji}</Text>;

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ navigation }) => ({
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "700" },
        headerRight: () => <CartButton onPress={() => (navigation as any).navigate("Cart")} />,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      })}
    >
      <Tab.Screen
        name="Accueil"
        component={HomeScreen}
        options={{ title: "€ASH Angoulême", tabBarLabel: "Accueil", tabBarIcon: icon("🏠") }}
      />
      <Tab.Screen
        name="Categories"
        component={CategoriesScreen}
        options={{ title: "Catégories", tabBarLabel: "Catégories", tabBarIcon: icon("🗂️") }}
      />
      <Tab.Screen
        name="Rachat"
        component={EstimerScreen}
        options={{ title: "Rachat", tabBarLabel: "Rachat", tabBarIcon: icon("💸") }}
      />
      <Tab.Screen
        name="Compte"
        component={AccountScreen}
        options={{ title: "Mon compte", tabBarLabel: "Compte", tabBarIcon: icon("👤") }}
      />
    </Tab.Navigator>
  );
}
