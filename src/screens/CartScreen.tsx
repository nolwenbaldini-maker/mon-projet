import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useCart } from "../context/CartContext";
import type { CartProps } from "../navigation";
import { colors, formatMoney } from "../theme";

export function CartScreen(_props: CartProps) {
  const { cart, removeLine, loading } = useCart();
  const [checkingOut, setCheckingOut] = useState(false);

  async function checkout() {
    if (!cart) return;
    setCheckingOut(true);
    try {
      // Ouvre le checkout sécurisé Shopify (paiement CB / PayPal déjà configuré).
      // Le paiement met à jour le stock dans Shopify → identique au site web.
      await WebBrowser.openBrowserAsync(cart.checkoutUrl);
    } finally {
      setCheckingOut(false);
    }
  }

  if (!cart || cart.lines.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>Ton panier est vide</Text>
        <Text style={styles.emptyText}>
          Ajoute des articles depuis le catalogue pour les retrouver ici.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={cart.lines}
        keyExtractor={(line) => line.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const img = item.merchandise.product.featuredImage;
          return (
            <View style={styles.row}>
              {img ? (
                <Image source={{ uri: img.url }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.noThumb]} />
              )}
              <View style={styles.rowInfo}>
                <Text style={styles.rowTitle} numberOfLines={2}>
                  {item.merchandise.product.title}
                </Text>
                {item.merchandise.title !== "Default Title" && (
                  <Text style={styles.rowVariant}>{item.merchandise.title}</Text>
                )}
                <Text style={styles.rowPrice}>
                  {item.quantity} ×{" "}
                  {formatMoney(
                    item.merchandise.price.amount,
                    item.merchandise.price.currencyCode
                  )}
                </Text>
              </View>
              <TouchableOpacity onPress={() => removeLine(item.id)} hitSlop={10}>
                <Text style={styles.remove}>✕</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />

      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>
            {formatMoney(
              cart.cost.totalAmount.amount,
              cart.cost.totalAmount.currencyCode
            )}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.checkoutBtn}
          onPress={checkout}
          disabled={checkingOut || loading}
        >
          {checkingOut ? (
            <ActivityIndicator color={colors.accentText} />
          ) : (
            <Text style={styles.checkoutText}>Passer commande</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  emptyText: { marginTop: 8, color: colors.muted, textAlign: "center" },
  list: { padding: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  thumb: { width: 60, height: 60, borderRadius: 8, backgroundColor: colors.card },
  noThumb: { backgroundColor: colors.card },
  rowInfo: { flex: 1, marginLeft: 12 },
  rowTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  rowVariant: { fontSize: 13, color: colors.muted, marginTop: 2 },
  rowPrice: { fontSize: 14, color: colors.primary, marginTop: 4, fontWeight: "600" },
  remove: { fontSize: 18, color: colors.muted, paddingHorizontal: 8 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.border },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  totalLabel: { fontSize: 16, color: colors.text },
  totalValue: { fontSize: 20, fontWeight: "800", color: colors.text },
  checkoutBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
  },
  checkoutText: { color: colors.accentText, fontWeight: "700", fontSize: 16 },
});
