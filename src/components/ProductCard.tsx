import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { Product } from "../shopify/types";
import { colors, discountPercent, formatMoney } from "../theme";

interface Props {
  product: Product;
  onPress: () => void;
  /** Largeur fixe (px) pour un affichage en carrousel ; sinon prend la place dispo. */
  width?: number;
}

/** Vignette d'un produit dans la grille / liste / carrousel. */
export function ProductCard({ product, onPress, width }: Props) {
  const price = product.priceRange.minVariantPrice;
  const compareAt = product.compareAtPrice;
  const pct = discountPercent(price.amount, compareAt?.amount);
  const onPromo = pct > 0;

  return (
    <TouchableOpacity
      style={[styles.card, width ? { width, flex: 0 } : styles.flex]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View>
        {product.featuredImage ? (
          <Image source={{ uri: product.featuredImage.url }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.noImage]}>
            <Text style={styles.noImageText}>Pas de photo</Text>
          </View>
        )}
        {onPromo && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>-{pct}%</Text>
            <Text style={styles.badgeSub}>PROMO</Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {product.title}
        </Text>
        <View style={styles.priceRow}>
          <Text style={[styles.price, onPromo && styles.pricePromo]}>
            {formatMoney(price.amount, price.currencyCode)}
          </Text>
          {onPromo && compareAt && (
            <Text style={styles.strike}>
              {formatMoney(compareAt.amount, compareAt.currencyCode)}
            </Text>
          )}
        </View>
        {!product.availableForSale && (
          <Text style={styles.sold}>Épuisé</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    margin: 6,
    overflow: "hidden",
  },
  flex: { flex: 1 },
  image: { width: "100%", aspectRatio: 1, backgroundColor: colors.card },
  noImage: { alignItems: "center", justifyContent: "center" },
  noImageText: { color: colors.muted, fontSize: 12 },
  info: { padding: 10 },
  title: { fontSize: 14, fontWeight: "600", color: colors.text, minHeight: 36 },
  priceRow: { marginTop: 6, flexDirection: "row", alignItems: "center", gap: 7, flexWrap: "wrap" },
  price: { fontSize: 15, fontWeight: "800", color: colors.primary },
  pricePromo: { color: "#dc2626" },
  strike: { fontSize: 13, color: colors.muted, textDecorationLine: "line-through", fontWeight: "600" },
  sold: { marginTop: 4, fontSize: 12, color: colors.muted },
  badge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#dc2626",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  badgeText: { color: "#fff", fontWeight: "900", fontSize: 15, lineHeight: 17 },
  badgeSub: { color: "#fff", fontWeight: "800", fontSize: 8, letterSpacing: 1 },
});
