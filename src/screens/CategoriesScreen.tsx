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
  // Univers sélectionné (un seul affiché à la fois → moins de dispersion).
  const [selected, setSelected] = useState(UNIVERSES[0].key);

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

  // Univers réellement disponibles (qui ont au moins une rubrique en boutique).
  const universes = useMemo(
    () =>
      UNIVERSES.map((u) => ({
        ...u,
        rubriques: u.handles
          .map((h) => byHandle.get(h))
          .filter((c): c is Collection => Boolean(c)),
      })).filter((u) => u.rubriques.length > 0),
    [byHandle]
  );

  // Garde une sélection valide si l'univers par défaut n'a pas de rubriques.
  useEffect(() => {
    if (universes.length && !universes.some((u) => u.key === selected)) {
      setSelected(universes[0].key);
    }
  }, [universes, selected]);

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

  const current = universes.find((u) => u.key === selected) ?? universes[0];

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Catégories</Text>

      {/* Sélecteur d'univers : 5 grands choix, scrollable horizontalement */}
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.selector}
        >
          {universes.map((u) => {
            const active = u.key === current?.key;
            return (
              <TouchableOpacity
                key={u.key}
                style={[styles.pill, active && styles.pillActive]}
                activeOpacity={0.85}
                onPress={() => setSelected(u.key)}
              >
                <Text style={styles.pillEmoji}>{u.emoji}</Text>
                <Text style={[styles.pillText, active && styles.pillTextActive]}>{u.short}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Rubriques de l'univers sélectionné */}
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {current && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {current.emoji} {current.label}
            </Text>
            <View style={styles.grid}>
              {current.rubriques.map((c) => (
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
                      <Text style={styles.imgEmoji}>{current.emoji}</Text>
                    </View>
                  )}
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {c.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  err: { color: colors.primary },
  header: { fontSize: 24, fontWeight: "800", color: colors.text, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  selector: { paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  pill: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 84,
  },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillEmoji: { fontSize: 26, marginBottom: 4 },
  pillText: { fontSize: 13, fontWeight: "700", color: colors.text },
  pillTextActive: { color: "#fff" },
  section: { marginTop: 6, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: colors.text, marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  card: { marginBottom: 16 },
  img: { borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  imgEmpty: { alignItems: "center", justifyContent: "center" },
  imgEmoji: { fontSize: 48 },
  cardTitle: { marginTop: 7, fontSize: 13, fontWeight: "600", color: colors.text },
});
