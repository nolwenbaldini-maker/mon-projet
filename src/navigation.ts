import type { NativeStackScreenProps } from "@react-navigation/native-stack";

/** Liste des écrans et de leurs paramètres. */
export type RootStackParamList = {
  Home: undefined;
  Collection: { handle: string; title: string };
  Product: { handle: string; title: string };
  Cart: undefined;
  Account: undefined;
  Admin: undefined;
  AdminRachats: undefined;
  AdminRachat: { id: string; title: string };
  AdminProduct: undefined;
  Rachat: { id: string; title: string };
};

export type HomeProps = NativeStackScreenProps<RootStackParamList, "Home">;
export type CollectionProps = NativeStackScreenProps<RootStackParamList, "Collection">;
export type ProductProps = NativeStackScreenProps<RootStackParamList, "Product">;
export type CartProps = NativeStackScreenProps<RootStackParamList, "Cart">;
export type AccountProps = NativeStackScreenProps<RootStackParamList, "Account">;
export type RachatProps = NativeStackScreenProps<RootStackParamList, "Rachat">;
export type AdminRachatProps = NativeStackScreenProps<RootStackParamList, "AdminRachat">;
