import { NavigationContainer } from "@react-navigation/native";
import {
  createNativeStackNavigator,
  type NativeStackNavigationOptions,
} from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { View } from "react-native";
import { AccountButton, CartButton } from "./src/components/HeaderButtons";
import { AuthProvider } from "./src/context/AuthContext";
import { CartProvider } from "./src/context/CartContext";
import type { RootStackParamList } from "./src/navigation";
import { AccountScreen } from "./src/screens/AccountScreen";
import { AdminScreen } from "./src/screens/AdminScreen";
import { CartScreen } from "./src/screens/CartScreen";
import { CollectionScreen } from "./src/screens/CollectionScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { ProductScreen } from "./src/screens/ProductScreen";
import { RachatScreen } from "./src/screens/RachatScreen";
import { colors } from "./src/theme";

const Stack = createNativeStackNavigator<RootStackParamList>();

/** Boutons "Mon compte" + "Panier" groupés dans l'en-tête. */
function headerButtons(navigation: any): NativeStackNavigationOptions {
  return {
    headerRight: () => (
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <AccountButton onPress={() => navigation.navigate("Account")} />
        <CartButton onPress={() => navigation.navigate("Cart")} />
      </View>
    ),
  };
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <StatusBar style="light" />
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerStyle: { backgroundColor: colors.primary },
              headerTintColor: "#fff",
              headerTitleStyle: { fontWeight: "700" },
            }}
          >
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={({ navigation }) => ({
                title: "€ASH Angoulême",
                ...headerButtons(navigation),
              })}
            />
            <Stack.Screen
              name="Collection"
              component={CollectionScreen}
              options={({ navigation, route }) => ({
                title: route.params.title,
                ...headerButtons(navigation),
              })}
            />
            <Stack.Screen
              name="Product"
              component={ProductScreen}
              options={({ navigation, route }) => ({
                title: route.params.title,
                ...headerButtons(navigation),
              })}
            />
            <Stack.Screen
              name="Cart"
              component={CartScreen}
              options={{ title: "Mon panier" }}
            />
            <Stack.Screen
              name="Account"
              component={AccountScreen}
              options={{ title: "Mon compte" }}
            />
            <Stack.Screen
              name="Admin"
              component={AdminScreen}
              options={{ title: "Espace admin" }}
            />
            <Stack.Screen
              name="Rachat"
              component={RachatScreen}
              options={({ route }) => ({ title: route.params.title })}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </CartProvider>
    </AuthProvider>
  );
}
