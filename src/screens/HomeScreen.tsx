import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ProductCard } from "../components/ProductCard";
import { isShopifyConfigured } from "../config/shopify";
import type { HomeProps } from "../navigation";
import { getCollections, getProducts } from "../shopify/queries";
import type { Collection, Product } from "../shopify/types";
import { colors } from "../theme";
import { UNIVERSES } from "../universes";

export function HomeScreen({ navigation }: HomeProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [newProducts, setNewProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [cols, prods] = await Promise.all([getCollections(), getProducts()]);
      setCollections(cols);
      setNewProducts(prods.slice(0, 12));
    } catch (e: any) {
      setError(e.message ?? "Impossible de charger la boutique");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isShopifyConfigured()) {
      setLoading(false);
      setError("config");
      return;
    }
    load();
  }, []);

  const byHandle = useMemo(() => {
    const m = new Map<string, Collection>();
    collections.forEach((c) => m.set(c.handle, c));
    return m;
  }, [collections]);

  if (error === "config") {
    return (
      <View style={styles.center}>
        <Text style={styles.configTitle}>Connexion Shopify à configurer</Text>
        <Text style={styles.configText}>
          Renseigne ton domaine et ton jeton dans le fichier{"\n"}
          <Text style={styles.code}>.env</Text> (voir le README).
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <TouchableOpacity onPress={load} style={styles.retry}>
          <Text style={styles.retryText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Bandeau promo (comme sur le site) */}
      <View style={styles.promo}>
        <Text style={styles.promoText}>🚚 Livraison gratuite dès 100€ d'achat !</Text>
      </View>

      {/* Héros */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>
          Votre boutique spécialisée{"\n"}Jeux Vidéo, TCG & Produits Culturels
        </Text>
        <Text style={styles.heroSubtitle}>
          Achat & vente d'occasion à Angoulême-Champniers depuis 2014
        </Text>
        <TouchableOpacity
          style={styles.heroBtn}
          onPress={() =>
            navigation.navigate("Collection", { handle: "", title: "Tout le catalogue" })
          }
        >
          <Text style={styles.heroBtnText}>Voir tout le catalogue</Text>
        </TouchableOpacity>
      </View>

      {/* Nouveautés */}
      {newProducts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🆕 Nouveautés</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hList}
          >
            {newProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                width={150}
                onPress={() =>
                  navigation.navigate("Product", { handle: p.handle, title: p.title })
                }
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Univers et leurs rubriques */}
      {UNIVERSES.map((u) => {
        const rubriques = u.handles
          .map((h) => byHandle.get(h))
          .filter((c): c is Collection => Boolean(c));
        if (rubriques.length === 0) return null;
        return (
          <View key={u.key} style={styles.section}>
            <Text style={styles.sectionTitle}>
              {u.emoji} {u.label}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hList}
            >
              {rubriques.map((c) => (
                <RubriqueCard
                  key={c.id}
                  collection={c}
                  emoji={u.emoji}
                  onPress={() =>
                    navigation.navigate("Collection", { handle: c.handle, title: c.title })
                  }
                />
              ))}
            </ScrollView>
          </View>
        );
      })}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

/** Carte d'une rubrique (vignette + titre). */
function RubriqueCard({
  collection,
  emoji,
  onPress,
}: {
  collection: Collection;
  emoji: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.rubrique} onPress={onPress} activeOpacity={0.85}>
      {collection.thumbnail ? (
        <Image source={{ uri: collection.thumbnail }} style={styles.rubriqueImg} />
      ) : (
        <View style={[styles.rubriqueImg, styles.rubriquePlaceholder]}>
          <Text style={styles.rubriqueEmoji}>{emoji}</Text>
        </View>
      )}
      <Text style={styles.rubriqueTitle} numberOfLines={2}>
        {collection.title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: colors.background,
  },

  promo: { backgroundColor: colors.primaryDark, paddingVertical: 8, alignItems: "center" },
  promoText: { color: "#fff", fontSize: 13, fontWeight: "600" },

  hero: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 24 },
  heroTitle: { color: "#fff", fontSize: 20, fontWeight: "800", lineHeight: 27 },
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

  section: { marginTop: 20 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  hList: { paddingHorizontal: 10 },

  rubrique: { width: 130, marginHorizontal: 6 },
  rubriqueImg: {
    width: 130,
    height: 130,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rubriquePlaceholder: { alignItems: "center", justifyContent: "center" },
  rubriqueEmoji: { fontSize: 46 },
  rubriqueTitle: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
  },

  error: { color: colors.primary, textAlign: "center", marginBottom: 12 },
  retry: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryText: { color: "#fff", fontWeight: "600" },
  configTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 12 },
  configText: { textAlign: "center", color: colors.muted, lineHeight: 22 },
  code: { fontFamily: "monospace", color: colors.primary },
});
