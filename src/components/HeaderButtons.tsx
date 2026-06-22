import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useCart } from "../context/CartContext";
import { colors } from "../theme";

/** Bouton "Mon compte" (en-tête). */
export function AccountButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.btn} hitSlop={10}>
      <Text style={styles.icon}>👤</Text>
    </TouchableOpacity>
  );
}

/** Bouton panier avec pastille du nombre d'articles (en-tête). */
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
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: { color: colors.accentText, fontSize: 11, fontWeight: "700" },
});
