import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ProductCard } from "../components/ProductCard";
import type { CollectionProps } from "../navigation";
import { getProducts } from "../shopify/queries";
import type { Product } from "../shopify/types";
import { colors } from "../theme";

/** Liste des produits d'une rubrique (collection Shopify). */
export function CollectionScreen({ route, navigation }: CollectionProps) {
  const { handle } = route.params;
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setProducts(await getProducts(handle));
    } catch (e: any) {
      setError(e.message ?? "Impossible de charger les produits");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [handle]);

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
    <FlatList
      style={styles.container}
      data={products}
      keyExtractor={(item) => item.id}
      numColumns={2}
      contentContainerStyle={styles.grid}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
      ListEmptyComponent={
        <Text style={styles.empty}>Aucun produit dans cette rubrique pour le moment.</Text>
      }
      renderItem={({ item }) => (
        <ProductCard
          product={item}
          onPress={() =>
            navigation.navigate("Product", { handle: item.handle, title: item.title })
          }
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: colors.background },
  grid: { padding: 6 },
  empty: { textAlign: "center", color: colors.muted, marginTop: 40 },
  error: { color: colors.primary, textAlign: "center", marginBottom: 12 },
  retry: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 8 },
  retryText: { color: "#fff", fontWeight: "600" },
});
