import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { Product } from "../shopify/types";
import { colors, formatMoney } from "../theme";

interface Props {
  product: Product;
  onPress: () => void;
}

/** Vignette d'un produit dans la grille / liste. */
export function ProductCard({ product, onPress }: Props) {
  const price = product.priceRange.minVariantPrice;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      {product.featuredImage ? (
        <Image source={{ uri: product.featuredImage.url }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.noImage]}>
          <Text style={styles.noImageText}>Pas de photo</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {product.title}
        </Text>
        <Text style={styles.price}>
          {formatMoney(price.amount, price.currencyCode)}
        </Text>
        {!product.availableForSale && (
          <Text style={styles.sold}>Épuisé</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    margin: 6,
    overflow: "hidden",
  },
  image: { width: "100%", aspectRatio: 1, backgroundColor: colors.card },
  noImage: { alignItems: "center", justifyContent: "center" },
  noImageText: { color: colors.muted, fontSize: 12 },
  info: { padding: 10 },
  title: { fontSize: 14, fontWeight: "600", color: colors.text, minHeight: 36 },
  price: { marginTop: 6, fontSize: 15, fontWeight: "700", color: colors.primary },
  sold: { marginTop: 4, fontSize: 12, color: colors.muted },
});
