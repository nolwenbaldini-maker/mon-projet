import type { NativeStackScreenProps } from "@react-navigation/native-stack";

/** Liste des écrans et de leurs paramètres. */
export type RootStackParamList = {
  Home: undefined;
  Collection: { handle: string; title: string };
  Product: { handle: string; title: string };
  Cart: undefined;
  Account: undefined;
};

export type HomeProps = NativeStackScreenProps<RootStackParamList, "Home">;
export type CollectionProps = NativeStackScreenProps<RootStackParamList, "Collection">;
export type ProductProps = NativeStackScreenProps<RootStackParamList, "Product">;
export type CartProps = NativeStackScreenProps<RootStackParamList, "Cart">;
export type AccountProps = NativeStackScreenProps<RootStackParamList, "Account">;
