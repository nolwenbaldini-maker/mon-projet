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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCart } from "../context/CartContext";
import type { ProductProps } from "../navigation";
import { getProductByHandle } from "../shopify/queries";
import type { Product, ProductImage, ProductVariant } from "../shopify/types";
import { colors, discountPercent, formatMoney } from "../theme";

export function ProductScreen({ route, navigation }: ProductProps) {
  const { handle } = route.params;
  const insets = useSafeAreaInsets();
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
  // Prix barré : celui de la variante sélectionnée en priorité, sinon celui du produit.
  const compareAt = variant?.compareAtPrice ?? product.compareAtPrice;
  const promoPct = discountPercent(price.amount, compareAt?.amount);
  const savings =
    promoPct > 0 && compareAt ? Number(compareAt.amount) - Number(price.amount) : 0;

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
          {promoPct > 0 && compareAt && (
            <View style={styles.promoBanner}>
              <View style={styles.promoPctBox}>
                <Text style={styles.promoPctBig}>-{promoPct}%</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.promoBannerTitle}>🔥 PROMOTION</Text>
                <Text style={styles.promoBannerSub}>
                  Économise {formatMoney(String(savings), price.currencyCode)} sur ce produit
                </Text>
              </View>
            </View>
          )}
          <Text style={styles.title}>{product.title}</Text>
          <View style={styles.priceRow}>
            <Text style={[styles.price, promoPct > 0 && styles.pricePromo]}>
              {formatMoney(price.amount, price.currencyCode)}
            </Text>
            {promoPct > 0 && compareAt && (
              <Text style={styles.strike}>
                {formatMoney(compareAt.amount, compareAt.currencyCode)}
              </Text>
            )}
          </View>

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
      <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
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
  promoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#dc2626",
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  promoPctBox: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 66,
    alignItems: "center",
  },
  promoPctBig: { color: "#dc2626", fontSize: 22, fontWeight: "900" },
  promoBannerTitle: { color: "#fff", fontSize: 15, fontWeight: "900", letterSpacing: 0.5 },
  promoBannerSub: { color: "#ffe4e4", fontSize: 13, fontWeight: "600", marginTop: 2 },
  title: { fontSize: 20, fontWeight: "700", color: colors.text },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap" },
  price: { fontSize: 24, fontWeight: "900", color: colors.primary },
  pricePromo: { color: "#dc2626" },
  strike: { fontSize: 17, color: colors.muted, textDecorationLine: "line-through", fontWeight: "600" },
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
