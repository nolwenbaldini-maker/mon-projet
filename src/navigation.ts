import type { NativeStackScreenProps } from "@react-navigation/native-stack";

/** Liste des écrans et de leurs paramètres. */
export type RootStackParamList = {
  Home: undefined;
  Product: { handle: string; title: string };
  Cart: undefined;
};

export type HomeProps = NativeStackScreenProps<RootStackParamList, "Home">;
export type ProductProps = NativeStackScreenProps<RootStackParamList, "Product">;
export type CartProps = NativeStackScreenProps<RootStackParamList, "Cart">;
