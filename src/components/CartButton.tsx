import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useCart } from "../context/CartContext";
import { colors } from "../theme";

/** Bouton panier affiché dans l'en-tête, avec une pastille du nombre d'articles. */
export function CartButton({ onPress }: { onPress: () => void }) {
  const { cart } = useCart();
  const count = cart?.totalQuantity ?? 0;

  return (
    <TouchableOpacity onPress={onPress} style={styles.btn} hitSlop={10}>
      <Text style={styles.icon}>🛒</Text>
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { paddingHorizontal: 6 },
  icon: { fontSize: 22 },
  badge: {
    position: "absolute",
    top: -4,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
});
