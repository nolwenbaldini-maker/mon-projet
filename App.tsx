import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { CartButton } from "./src/components/HeaderButtons";
import { AuthProvider } from "./src/context/AuthContext";
import { CartProvider } from "./src/context/CartContext";
import { MainTabs } from "./src/MainTabs";
import type { RootStackParamList } from "./src/navigation";
import { AdminArgusScreen } from "./src/screens/AdminArgusScreen";
import { AdminProductScreen } from "./src/screens/AdminProductScreen";
import { AdminRachatScreen } from "./src/screens/AdminRachatScreen";
import { AdminRachatsScreen } from "./src/screens/AdminRachatsScreen";
import { AdminScreen } from "./src/screens/AdminScreen";
import { CartScreen } from "./src/screens/CartScreen";
import { CollectionScreen } from "./src/screens/CollectionScreen";
import { ProductScreen } from "./src/screens/ProductScreen";
import { RachatRequestScreen } from "./src/screens/RachatRequestScreen";
import { RachatScreen } from "./src/screens/RachatScreen";
import { colors } from "./src/theme";

const Stack = createNativeStackNavigator<RootStackParamList>();

const greenHeader = {
  headerStyle: { backgroundColor: colors.primary },
  headerTintColor: "#fff",
  headerTitleStyle: { fontWeight: "700" as const },
};

/** En-tête vert avec bouton panier (écrans de navigation produit). */
function withCart(navigation: any, title: string) {
  return {
    ...greenHeader,
    title,
    headerRight: () => <CartButton onPress={() => navigation.navigate("Cart")} />,
  };
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <StatusBar style="light" />
        <NavigationContainer>
          <Stack.Navigator screenOptions={greenHeader}>
            <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />

            <Stack.Screen
              name="Collection"
              component={CollectionScreen}
              options={({ navigation, route }) => withCart(navigation, route.params.title)}
            />
            <Stack.Screen
              name="Product"
              component={ProductScreen}
              options={({ navigation, route }) => withCart(navigation, route.params.title)}
            />
            <Stack.Screen name="Cart" component={CartScreen} options={{ title: "Mon panier" }} />

            <Stack.Screen
              name="RachatRequest"
              component={RachatRequestScreen}
              options={{ title: "Demande de rachat" }}
            />
            <Stack.Screen
              name="RachatDetail"
              component={RachatScreen}
              options={({ route }) => ({ title: route.params.title })}
            />

            <Stack.Screen name="Admin" component={AdminScreen} options={{ title: "Espace admin" }} />
            <Stack.Screen name="AdminRachats" component={AdminRachatsScreen} options={{ title: "Gérer les rachats" }} />
            <Stack.Screen
              name="AdminRachat"
              component={AdminRachatScreen}
              options={({ route }) => ({ title: route.params.title })}
            />
            <Stack.Screen name="AdminProduct" component={AdminProductScreen} options={{ title: "Publier un produit" }} />
            <Stack.Screen name="AdminArgus" component={AdminArgusScreen} options={{ title: "Gérer l'argus" }} />
          </Stack.Navigator>
        </NavigationContainer>
      </CartProvider>
    </AuthProvider>
  );
}
