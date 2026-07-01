import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ProductCard } from "../components/ProductCard";
import { isShopifyConfigured } from "../config/shopify";
import { getProducts, getPromoProducts } from "../shopify/queries";
import type { Product } from "../shopify/types";
import { colors, discountPercent } from "../theme";
import { UNIVERSES } from "../universes";

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const [newProducts, setNewProducts] = useState<Product[]>([]);
  const [promos, setPromos] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pour faire défiler jusqu'à la section Promotions au clic sur la bannière.
  const scrollRef = useRef<ScrollView>(null);
  const promoY = useRef(0);
  const scrollToPromos = () =>
    scrollRef.current?.scrollTo({ y: Math.max(0, promoY.current - 8), animated: true });

  async function load(silent = false) {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const prods = await getProducts();
      setNewProducts(prods.slice(0, 12));
      // Promotions (non bloquant : si ça échoue, on n'affiche juste pas la section)
      getPromoProducts()
        .then((p) => setPromos(p.slice(0, 12)))
        .catch(() => setPromos([]));
    } catch (e: any) {
      setError(e.message ?? "Impossible de charger la boutique");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  const didInitialLoad = useRef(false);

  useEffect(() => {
    if (!isShopifyConfigured()) {
      setLoading(false);
      setError("config");
      return;
    }
    load();
    didInitialLoad.current = true;
  }, []);

  // À chaque retour sur l'accueil : rafraîchit en silence pour refléter les
  // promotions qu'on vient d'appliquer côté admin (sans faire clignoter l'écran).
  useFocusEffect(
    useCallback(() => {
      if (didInitialLoad.current && isShopifyConfigured()) load(true);
    }, [])
  );

  if (error === "config") {
    return (
      <View style={styles.center}>
        <Text style={styles.configTitle}>Connexion Shopify à configurer</Text>
        <Text style={styles.configText}>
          Renseigne tes identifiants dans le fichier <Text style={styles.code}>.env</Text>.
        </Text>
      </View>
    );
  }

  // Meilleure réduction parmi les promos en cours (pour la bannière).
  const maxPct = promos.reduce((m, p) => {
    const pct = discountPercent(p.priceRange.minVariantPrice.amount, p.compareAtPrice?.amount);
    return pct > m ? pct : m;
  }, 0);

  return (
    <ScrollView ref={scrollRef} style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.promo}>
        <Text style={styles.promoText}>🚚 Livraison gratuite dès 100€ d'achat !</Text>
      </View>

      {/* Bannière PROMOTIONS (visible uniquement s'il y a des promos en cours) */}
      {promos.length > 0 && (
        <TouchableOpacity style={styles.promoBanner} activeOpacity={0.9} onPress={scrollToPromos}>
          {maxPct > 0 && (
            <View style={styles.promoBannerPct}>
              <Text style={styles.promoBannerPctText}>-{maxPct}%</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.promoBannerTitle}>🔥 PROMOTIONS EN COURS</Text>
            <Text style={styles.promoBannerSub}>
              {promos.length} bon{promos.length > 1 ? "s" : ""} plan{promos.length > 1 ? "s" : ""}
              {maxPct > 0 ? ` — jusqu'à -${maxPct}%` : " — prix réduits"} !
            </Text>
          </View>
          <Text style={styles.promoBannerCta}>Voir ›</Text>
        </TouchableOpacity>
      )}

      {/* Héros */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Jeux Vidéo · TCG · Produits Culturels</Text>
        <Text style={styles.heroSubtitle}>
          Achat & vente d'occasion à Angoulême-Champniers depuis 2014
        </Text>
        <TouchableOpacity
          style={styles.heroBtn}
          onPress={() => navigation.navigate("Collection", { handle: "", title: "Tout le catalogue" })}
        >
          <Text style={styles.heroBtnText}>Voir le catalogue</Text>
        </TouchableOpacity>
      </View>

      {/* Bannière estimation / rachat */}
      <TouchableOpacity style={styles.estim} onPress={() => navigation.navigate("Rachat")}>
        <Text style={styles.estimEmoji}>💸</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.estimTitle}>Vends tes appareils</Text>
          <Text style={styles.estimSub}>Estime ton smartphone ou ta console en 1 minute</Text>
        </View>
        <Text style={styles.estimArrow}>›</Text>
      </TouchableOpacity>

      {/* Promotions */}
      {promos.length > 0 && (
        <View onLayout={(e) => (promoY.current = e.nativeEvent.layout.y)}>
          <View style={styles.promoHeader}>
            <Text style={styles.sectionTitleInline}>🔥 Promotions</Text>
            <View style={styles.promoTag}>
              <Text style={styles.promoTagText}>Bons plans</Text>
            </View>
          </View>
          <FlatList
            horizontal
            data={promos}
            keyExtractor={(p) => p.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hList}
            initialNumToRender={4}
            removeClippedSubviews
            renderItem={({ item: p }) => (
              <ProductCard
                product={p}
                width={150}
                onPress={() => navigation.navigate("Product", { handle: p.handle, title: p.title })}
              />
            )}
          />
        </View>
      )}

      {/* Nos univers (accès rapide) */}
      <Text style={styles.sectionTitle}>Nos univers</Text>
      <View style={styles.universes}>
        {UNIVERSES.map((u) => (
          <TouchableOpacity
            key={u.key}
            style={styles.uniTile}
            onPress={() => navigation.navigate("Categories")}
          >
            <Text style={styles.uniEmoji}>{u.emoji}</Text>
            <Text style={styles.uniLabel} numberOfLines={2}>
              {u.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Nouveautés */}
      <Text style={styles.sectionTitle}>🆕 Nouveautés</Text>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 30 }} />
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <TouchableOpacity onPress={() => load()} style={styles.retry}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          horizontal
          data={newProducts}
          keyExtractor={(p) => p.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hList}
          initialNumToRender={4}
          removeClippedSubviews
          renderItem={({ item: p }) => (
            <ProductCard
              product={p}
              width={150}
              onPress={() => navigation.navigate("Product", { handle: p.handle, title: p.title })}
            />
          )}
        />
      )}

      <View style={{ height: 28 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: "center", justifyContent: "center", padding: 24 },

  promo: { backgroundColor: colors.primaryDark, paddingVertical: 8, alignItems: "center" },
  promoText: { color: "#fff", fontSize: 13, fontWeight: "600" },

  promoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#dc2626",
    marginHorizontal: 12,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: "#dc2626",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  promoBannerPct: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 60,
    alignItems: "center",
  },
  promoBannerPctText: { color: "#dc2626", fontSize: 18, fontWeight: "900" },
  promoBannerTitle: { color: "#fff", fontSize: 15, fontWeight: "900", letterSpacing: 0.5 },
  promoBannerSub: { color: "#ffe4e4", fontSize: 12, marginTop: 2, fontWeight: "600" },
  promoBannerCta: { color: "#fff", fontSize: 14, fontWeight: "800" },

  hero: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 22 },
  heroTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
  heroSubtitle: { color: "#d6e6dc", fontSize: 13, marginTop: 8 },
  heroBtn: {
    alignSelf: "flex-start",
    marginTop: 16,
    backgroundColor: colors.accent,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 24,
  },
  heroBtnText: { color: colors.accentText, fontWeight: "700", fontSize: 14 },

  estim: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    margin: 16,
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
  },
  estimEmoji: { fontSize: 30 },
  estimTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
  estimSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  estimArrow: { fontSize: 26, color: colors.muted },

  sectionTitle: { fontSize: 17, fontWeight: "800", color: colors.text, paddingHorizontal: 16, marginTop: 8, marginBottom: 12 },
  promoHeader: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, marginTop: 8, marginBottom: 12 },
  sectionTitleInline: { fontSize: 17, fontWeight: "800", color: colors.text },
  promoTag: { backgroundColor: "#dc2626", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  promoTagText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  universes: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 10, gap: 0 },
  uniTile: {
    width: "20%",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  uniEmoji: { fontSize: 30 },
  uniLabel: { fontSize: 11, color: colors.text, textAlign: "center", marginTop: 5, fontWeight: "600" },

  hList: { paddingHorizontal: 10 },
  error: { color: colors.primary, textAlign: "center", marginBottom: 12 },
  retry: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 8 },
  retryText: { color: "#fff", fontWeight: "600" },
  configTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 12 },
  configText: { textAlign: "center", color: colors.muted, lineHeight: 22 },
  code: { fontFamily: "monospace", color: colors.primary },
});
