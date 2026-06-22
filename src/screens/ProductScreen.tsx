import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useCart } from "../context/CartContext";
import type { ProductProps } from "../navigation";
import { getProductByHandle } from "../shopify/queries";
import type { Product, ProductImage, ProductVariant } from "../shopify/types";
import { colors, formatMoney } from "../theme";

export function ProductScreen({ route, navigation }: ProductProps) {
  const { handle } = route.params;
  const { addToCart, loading: cartLoading } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [variant, setVariant] = useState<ProductVariant | null>(null);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    getProductByHandle(handle)
      .then((p) => {
        setProduct(p);
        setVariant(p?.variants[0] ?? null);
      })
      .finally(() => setLoading(false));
  }, [handle]);

  async function handleAdd() {
    if (!variant) return;
    await addToCart(variant.id, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.center}>
        <Text>Produit introuvable.</Text>
      </View>
    );
  }

  const price = variant?.price ?? product.priceRange.minVariantPrice;
  const canBuy = variant?.availableForSale ?? false;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ProductGallery
          images={
            product.images.length > 0
              ? product.images
              : product.featuredImage
              ? [product.featuredImage]
              : []
          }
        />
        <View style={styles.body}>
          <Text style={styles.title}>{product.title}</Text>
          <Text style={styles.price}>
            {formatMoney(price.amount, price.currencyCode)}
          </Text>

          {/* Choix de la variante si le produit en a plusieurs */}
          {product.variants.length > 1 && (
            <View style={styles.variants}>
              {product.variants.map((v) => (
                <TouchableOpacity
                  key={v.id}
                  disabled={!v.availableForSale}
                  onPress={() => setVariant(v)}
                  style={[
                    styles.variant,
                    variant?.id === v.id && styles.variantActive,
                    !v.availableForSale && styles.variantDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.variantText,
                      variant?.id === v.id && styles.variantTextActive,
                    ]}
                  >
                    {v.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {product.description ? (
            <Text style={styles.description}>{product.description}</Text>
          ) : null}
        </View>
      </ScrollView>

      {/* Barre d'achat fixe en bas */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.addBtn, (!canBuy || cartLoading) && styles.addBtnDisabled]}
          disabled={!canBuy || cartLoading}
          onPress={handleAdd}
        >
          {cartLoading ? (
            <ActivityIndicator color={colors.accentText} />
          ) : (
            <Text style={styles.addBtnText}>
              {!canBuy ? "Épuisé" : added ? "✓ Ajouté !" : "Ajouter au panier"}
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cartLink}
          onPress={() => navigation.navigate("Cart")}
        >
          <Text style={styles.cartLinkText}>Voir le panier</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/** Galerie de photos glissable, avec points indicateurs. */
function ProductGallery({ images }: { images: ProductImage[] }) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  if (images.length === 0) {
    return (
      <View style={[styles.image, { width, height: width }, styles.noImage]}>
        <Text style={styles.noImageText}>Pas de photo</Text>
      </View>
    );
  }

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  }

  return (
    <View>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
      >
        {images.map((img, i) => (
          <Image
            key={i}
            source={{ uri: img.url }}
            style={[styles.image, { width, height: width }]}
          />
        ))}
      </ScrollView>
      {images.length > 1 && (
        <View style={styles.dots}>
          {images.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { paddingBottom: 24 },
  image: { backgroundColor: colors.card },
  noImage: { alignItems: "center", justifyContent: "center" },
  noImageText: { color: colors.muted },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: { backgroundColor: colors.primary, width: 18 },
  body: { padding: 16 },
  title: { fontSize: 20, fontWeight: "700", color: colors.text },
  price: { fontSize: 22, fontWeight: "800", color: colors.primary, marginTop: 8 },
  variants: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  variant: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
    marginBottom: 8,
  },
  variantActive: { borderColor: colors.primary, backgroundColor: "#e3efe8" },
  variantDisabled: { opacity: 0.4 },
  variantText: { color: colors.text },
  variantTextActive: { color: colors.primary, fontWeight: "700" },
  description: { marginTop: 16, fontSize: 15, lineHeight: 22, color: colors.muted },
  footer: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  addBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnDisabled: { backgroundColor: colors.muted },
  addBtnText: { color: colors.accentText, fontWeight: "700", fontSize: 16 },
  cartLink: {
    paddingHorizontal: 16,
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cartLinkText: { color: colors.text, fontWeight: "600" },
});
