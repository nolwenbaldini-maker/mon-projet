import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { CartButton } from "./src/components/CartButton";
import { CartProvider } from "./src/context/CartContext";
import type { RootStackParamList } from "./src/navigation";
import { CartScreen } from "./src/screens/CartScreen";
import { CollectionScreen } from "./src/screens/CollectionScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { ProductScreen } from "./src/screens/ProductScreen";
import { colors } from "./src/theme";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
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
              headerRight: () => (
                <CartButton onPress={() => navigation.navigate("Cart")} />
              ),
            })}
          />
          <Stack.Screen
            name="Collection"
            component={CollectionScreen}
            options={({ navigation, route }) => ({
              title: route.params.title,
              headerRight: () => (
                <CartButton onPress={() => navigation.navigate("Cart")} />
              ),
            })}
          />
          <Stack.Screen
            name="Product"
            component={ProductScreen}
            options={({ navigation, route }) => ({
              title: route.params.title,
              headerRight: () => (
                <CartButton onPress={() => navigation.navigate("Cart")} />
              ),
            })}
          />
          <Stack.Screen
            name="Cart"
            component={CartScreen}
            options={{ title: "Mon panier" }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </CartProvider>
  );
}
