import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  getArgusConsoles,
  getArgusSmartphones,
  syncArgusConsoles,
  syncArgusSmartphones,
  type ArgusConsole,
  type ArgusSmartphone,
} from "../lib/argus";
import { colors } from "../theme";

type Tab = "smartphones" | "consoles";

function euro(n: number | null): string {
  return n == null ? "—" : `${n} €`;
}

export function AdminArgusScreen() {
  const [tab, setTab] = useState<Tab>("smartphones");
  const [phones, setPhones] = useState<ArgusSmartphone[]>([]);
  const [consoles, setConsoles] = useState<ArgusConsole[]>([]);
  const [brand, setBrand] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const [p, c] = await Promise.all([getArgusSmartphones(), getArgusConsoles()]);
      setPhones(p);
      setConsoles(c);
    } catch {
      setError("Accès refusé ou erreur. Ton compte a-t-il le rôle admin ?");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const brands = useMemo(
    () => Array.from(new Set(phones.map((p) => p.brand))).sort(),
    [phones]
  );

  async function actualiser() {
    setSyncing(true);
    try {
      if (tab === "consoles") {
        await syncArgusConsoles();
      } else {
        if (!brand) {
          Alert.alert("Choisis une marque", "Sélectionne une marque à actualiser.");
          return;
        }
        await syncArgusSmartphones(brand);
      }
      Alert.alert(
        "Actualisation lancée 🔄",
        "La mise à jour des prix est en cours. Reviens dans un moment puis tire pour rafraîchir.",
        [{ text: "OK", onPress: load }]
      );
    } catch (e: any) {
      Alert.alert("Erreur", e.message ?? "L'actualisation a échoué.");
    } finally {
      setSyncing(false);
    }
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
      </View>
    );
  }

  const phonesShown = brand ? phones.filter((p) => p.brand === brand) : phones;

  return (
    <View style={styles.container}>
      {/* Onglets */}
      <View style={styles.tabs}>
        <Tab2 label="📱 Smartphones" active={tab === "smartphones"} onPress={() => setTab("smartphones")} />
        <Tab2 label="🎮 Consoles" active={tab === "consoles"} onPress={() => setTab("consoles")} />
      </View>

      {/* Filtre marque (smartphones) */}
      {tab === "smartphones" && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.brandsWrap} contentContainerStyle={styles.brands}>
          <Chip label="Toutes" active={brand === null} onPress={() => setBrand(null)} />
          {brands.map((b) => (
            <Chip key={b} label={b} active={brand === b} onPress={() => setBrand(b)} />
          ))}
        </ScrollView>
      )}

      {/* Bouton actualiser */}
      <TouchableOpacity style={styles.syncBtn} onPress={actualiser} disabled={syncing}>
        {syncing ? (
          <ActivityIndicator color={colors.accentText} />
        ) : (
          <Text style={styles.syncText}>
            {tab === "consoles"
              ? "🔄 Actualiser les consoles"
              : `🔄 Actualiser ${brand ? brand : "(choisir une marque)"}`}
          </Text>
        )}
      </TouchableOpacity>

      {/* Liste */}
      {tab === "smartphones" ? (
        <FlatList
          data={phonesShown}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
          ListEmptyComponent={<Text style={styles.empty}>Aucune entrée.</Text>}
          renderItem={({ item }) => (
            <ArgusRow
              title={`${item.brand} ${item.model}`}
              sub={[item.capacity, item.color].filter(Boolean).join(" · ")}
              perfect={item.price_perfect}
              good={item.price_good}
              correct={item.price_correct}
            />
          )}
        />
      ) : (
        <FlatList
          data={consoles}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
          ListEmptyComponent={<Text style={styles.empty}>Aucune entrée.</Text>}
          renderItem={({ item }) => (
            <ArgusRow
              title={`${item.brand} ${item.family ? item.family + " " : ""}${item.model}`}
              sub={item.capacity || ""}
              perfect={item.price_perfect}
              good={item.price_good}
              correct={item.price_correct}
            />
          )}
        />
      )}
    </View>
  );
}

function ArgusRow({
  title,
  sub,
  perfect,
  good,
  correct,
}: {
  title: string;
  sub: string;
  perfect: number | null;
  good: number | null;
  correct: number | null;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowTitle}>{title}</Text>
      {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      <View style={styles.prices}>
        <Price label="Parfait" value={perfect} />
        <Price label="Bon" value={good} />
        <Price label="Correct" value={correct} />
      </View>
    </View>
  );
}

function Price({ label, value }: { label: string; value: number | null }) {
  return (
    <View style={styles.price}>
      <Text style={styles.priceLabel}>{label}</Text>
      <Text style={styles.priceValue}>{euro(value)}</Text>
    </View>
  );
}

function Tab2({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.tab, active && styles.tabActive]} onPress={onPress}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: colors.background },
  error: { color: colors.primary, textAlign: "center" },
  tabs: { flexDirection: "row", padding: 10, gap: 10 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.card, alignItems: "center" },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontWeight: "700", color: colors.text },
  tabTextActive: { color: "#fff" },
  brandsWrap: { maxHeight: 50 },
  brands: { paddingHorizontal: 10, paddingBottom: 6, gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: colors.card, marginRight: 8 },
  chipActive: { backgroundColor: colors.primary },
  chipText: { color: colors.text, fontWeight: "600", fontSize: 13 },
  chipTextActive: { color: "#fff" },
  syncBtn: {
    margin: 10,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
  },
  syncText: { color: colors.accentText, fontWeight: "700", fontSize: 15 },
  list: { padding: 12, paddingTop: 0 },
  empty: { textAlign: "center", color: colors.muted, marginTop: 30 },
  row: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  rowTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  rowSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  prices: { flexDirection: "row", marginTop: 8, gap: 8 },
  price: { flex: 1, backgroundColor: colors.card, borderRadius: 8, paddingVertical: 6, alignItems: "center" },
  priceLabel: { fontSize: 11, color: colors.muted },
  priceValue: { fontSize: 14, fontWeight: "800", color: colors.primary, marginTop: 2 },
});
