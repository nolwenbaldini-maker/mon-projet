import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { getCollections } from "../shopify/queries";
import type { Collection } from "../shopify/types";
import { colors } from "../theme";
import { UNIVERSES } from "../universes";

export function CategoriesScreen() {
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const cardW = (width - 16 * 2 - 12) / 2; // 2 colonnes, marges 16, gap 12

  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getCollections()
      .then(setCollections)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const byHandle = useMemo(() => {
    const m = new Map<string, Collection>();
    collections.forEach((c) => m.set(c.handle, c));
    return m;
  }, [collections]);

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
        <Text style={styles.err}>Impossible de charger les catégories.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
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
            <View style={styles.grid}>
              {rubriques.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.card, { width: cardW }]}
                  activeOpacity={0.85}
                  onPress={() =>
                    navigation.navigate("Collection", { handle: c.handle, title: c.title })
                  }
                >
                  {c.thumbnail ? (
                    <Image source={{ uri: c.thumbnail }} style={[styles.img, { width: cardW, height: cardW }]} />
                  ) : (
                    <View style={[styles.img, styles.imgEmpty, { width: cardW, height: cardW }]}>
                      <Text style={styles.imgEmoji}>{u.emoji}</Text>
                    </View>
                  )}
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {c.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  err: { color: colors.primary },
  section: { marginTop: 18, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: colors.text, marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  card: { marginBottom: 16 },
  img: { borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  imgEmpty: { alignItems: "center", justifyContent: "center" },
  imgEmoji: { fontSize: 48 },
  cardTitle: { marginTop: 7, fontSize: 13, fontWeight: "600", color: colors.text },
});
