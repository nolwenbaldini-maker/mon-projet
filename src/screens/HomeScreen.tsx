import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
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

export function HomeScreen({ navigation }: HomeProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(handle: string | null) {
    setLoading(true);
    setError(null);
    try {
      const items = await getProducts(handle ?? undefined);
      setProducts(items);
    } catch (e: any) {
      setError(e.message ?? "Impossible de charger les produits");
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
    getCollections().then(setCollections).catch(() => {});
    load(null);
  }, []);

  if (error === "config") {
    return (
      <View style={styles.center}>
        <Text style={styles.configTitle}>Connexion Shopify à configurer</Text>
        <Text style={styles.configText}>
          Ouvre le fichier{"\n"}
          <Text style={styles.code}>src/config/shopify.ts</Text>
          {"\n"}et renseigne ton domaine et ton jeton Storefront API.
          {"\n\n"}Les instructions sont dans le README.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Barre des rayons (collections) */}
      <View style={styles.chipsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          <Chip
            label="Tout"
            active={activeHandle === null}
            onPress={() => {
              setActiveHandle(null);
              load(null);
            }}
          />
          {collections.map((c) => (
            <Chip
              key={c.id}
              label={c.title}
              active={activeHandle === c.handle}
              onPress={() => {
                setActiveHandle(c.handle);
                load(c.handle);
              }}
            />
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <TouchableOpacity onPress={() => load(activeHandle)} style={styles.retry}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={() => load(activeHandle)} />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>Aucun produit dans ce rayon.</Text>
          }
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              onPress={() =>
                navigation.navigate("Product", {
                  handle: item.handle,
                  title: item.title,
                })
              }
            />
          )}
        />
      )}
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  chipsWrapper: { borderBottomWidth: 1, borderBottomColor: colors.border },
  chips: { paddingHorizontal: 8, paddingVertical: 10, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    marginRight: 8,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { color: colors.text, fontWeight: "600", fontSize: 13 },
  chipTextActive: { color: "#fff" },
  grid: { padding: 6 },
  empty: { textAlign: "center", color: colors.muted, marginTop: 40 },
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
