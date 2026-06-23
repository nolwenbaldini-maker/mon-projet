import { useNavigation } from "@react-navigation/native";
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
import { getAllRachatRequests, type RachatRequest } from "../lib/db";
import { colors } from "../theme";
import { rachatStatusLabel } from "./RachatScreen";

export function AdminRachatsScreen() {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<RachatRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      setItems(await getAllRachatRequests());
    } catch {
      setError("Accès refusé ou erreur. Ton compte a-t-il le rôle admin ?");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const unsub = navigation.addListener("focus", load);
    return unsub;
  }, [navigation]);

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
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={items}
      keyExtractor={(r) => r.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
      ListEmptyComponent={<Text style={styles.empty}>Aucune demande de rachat.</Text>}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() =>
            navigation.navigate("AdminRachat", { id: item.id, title: "Rachat" })
          }
        >
          <View style={styles.top}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.description || "Demande de rachat"}
            </Text>
            <Text style={styles.badge}>{rachatStatusLabel(item.status)}</Text>
          </View>
          <Text style={styles.date}>
            {new Date(item.created_at).toLocaleDateString("fr-FR")}
            {item.photo_urls?.length ? ` · ${item.photo_urls.length} photo(s)` : ""}
          </Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: colors.background },
  list: { padding: 14 },
  empty: { textAlign: "center", color: colors.muted, marginTop: 40 },
  error: { color: colors.primary, textAlign: "center" },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    backgroundColor: colors.card,
  },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: "700", color: colors.text },
  badge: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.accentText,
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: "hidden",
  },
  date: { fontSize: 13, color: colors.muted, marginTop: 4 },
});
