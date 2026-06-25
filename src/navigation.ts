import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { CustomerOrder } from "./lib/orders";

/** Onglets du bas. */
export type TabParamList = {
  Accueil: undefined;
  Categories: undefined;
  Rachat: undefined;
  Compte: undefined;
};

/** Pile principale : les onglets + les écrans de détail empilés par-dessus. */
export type RootStackParamList = {
  Main: undefined;
  Collection: { handle: string; title: string };
  Product: { handle: string; title: string };
  Cart: undefined;
  RachatRequest: { prefill?: string };
  RachatDetail: { id: string; title: string };
  OrderDetail: { order: CustomerOrder };
  OrderTrack: undefined;
  Admin: undefined;
  AdminRachats: undefined;
  AdminRachat: { id: string; title: string };
  AdminProduct: undefined;
  AdminArgus: undefined;
  AdminStock: undefined;
};

export type CollectionProps = NativeStackScreenProps<RootStackParamList, "Collection">;
export type ProductProps = NativeStackScreenProps<RootStackParamList, "Product">;
export type CartProps = NativeStackScreenProps<RootStackParamList, "Cart">;
export type RachatRequestProps = NativeStackScreenProps<RootStackParamList, "RachatRequest">;
export type RachatProps = NativeStackScreenProps<RootStackParamList, "RachatDetail">;
export type OrderDetailProps = NativeStackScreenProps<RootStackParamList, "OrderDetail">;
export type AdminRachatProps = NativeStackScreenProps<RootStackParamList, "AdminRachat">;
