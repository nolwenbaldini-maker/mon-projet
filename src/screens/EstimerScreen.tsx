import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ESTIMATION_STATES,
  getArgusConsoles,
  getArgusSmartphones,
  type ArgusConsole,
  type ArgusSmartphone,
} from "../lib/argus";
import { colors } from "../theme";

type Kind = "smartphone" | "console";
type Entry = (ArgusSmartphone | ArgusConsole) & { _label: string; _detail: string };

export function EstimerScreen() {
  const navigation = useNavigation<any>();
  const [kind, setKind] = useState<Kind>("smartphone");
  const [phones, setPhones] = useState<ArgusSmartphone[]>([]);
  const [consoles, setConsoles] = useState<ArgusConsole[]>([]);
  const [loading, setLoading] = useState(true);
  const [brand, setBrand] = useState<string | null>(null);
  const [entry, setEntry] = useState<Entry | null>(null);
  const [stateIdx, setStateIdx] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      getArgusSmartphones().catch(() => []),
      getArgusConsoles().catch(() => []),
    ]).then(([p, c]) => {
      setPhones(p);
      setConsoles(c);
      setLoading(false);
    });
  }, []);

  // Réinitialise la sélection en changeant de type
  useEffect(() => {
    setBrand(null);
    setEntry(null);
    setStateIdx(null);
  }, [kind]);

  const entries: Entry[] = useMemo(() => {
    if (kind === "smartphone") {
      return phones.map((p) => ({
        ...p,
        _label: `${p.brand} ${p.model}`,
        _detail: [p.capacity, p.color].filter(Boolean).join(" · "),
      }));
    }
    return consoles.map((c) => ({
      ...c,
      _label: `${c.brand} ${c.family ? c.family + " " : ""}${c.model}`,
      _detail: c.capacity || "",
    }));
  }, [kind, phones, consoles]);

  const brands = useMemo(
    () => Array.from(new Set(entries.map((e) => e.brand))).sort(),
    [entries]
  );

  const brandEntries = brand ? entries.filter((e) => e.brand === brand) : [];

  const price =
    entry && stateIdx != null
      ? (entry as any)[ESTIMATION_STATES[stateIdx].priceKey]
      : null;

  function demanderRachat() {
    if (!entry || stateIdx == null) return;
    const st = ESTIMATION_STATES[stateIdx];
    const detail = entry._detail ? ` ${entry._detail}` : "";
    const estim = price != null ? ` — estimation ${price} €` : "";
    const description = `${entry._label}${detail} (${st.label})${estim}`;
    navigation.navigate("RachatRequest", { prefill: description });
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.h1}>Estime ton produit</Text>
      <Text style={styles.sub}>Obtiens une estimation de reprise en quelques clics.</Text>

      {/* Type */}
      <View style={styles.toggle}>
        <Toggle label="📱 Smartphone" active={kind === "smartphone"} onPress={() => setKind("smartphone")} />
        <Toggle label="🎮 Console" active={kind === "console"} onPress={() => setKind("console")} />
      </View>

      {/* Marque */}
      <Text style={styles.label}>1. Choisis la marque</Text>
      <View style={styles.wrap}>
        {brands.map((b) => (
          <Chip key={b} label={b} active={brand === b} onPress={() => { setBrand(b); setEntry(null); setStateIdx(null); }} />
        ))}
      </View>

      {/* Modèle */}
      {brand && (
        <>
          <Text style={styles.label}>2. Choisis le modèle</Text>
          {brandEntries.map((e) => (
            <TouchableOpacity
              key={e.id}
              style={[styles.modelRow, entry?.id === e.id && styles.modelActive]}
              onPress={() => { setEntry(e); setStateIdx(null); }}
            >
              <Text style={[styles.modelTitle, entry?.id === e.id && styles.modelTitleActive]}>{e._label}</Text>
              {e._detail ? <Text style={styles.modelDetail}>{e._detail}</Text> : null}
            </TouchableOpacity>
          ))}
        </>
      )}

      {/* État */}
      {entry && (
        <>
          <Text style={styles.label}>3. Dans quel état ?</Text>
          {ESTIMATION_STATES.map((s, i) => (
            <TouchableOpacity
              key={s.label}
              style={[styles.stateCard, stateIdx === i && styles.stateActive]}
              onPress={() => setStateIdx(i)}
            >
              <Text style={[styles.stateTitle, stateIdx === i && styles.stateTitleActive]}>{s.label}</Text>
              <Text style={styles.stateDesc}>{s.description}</Text>
            </TouchableOpacity>
          ))}
        </>
      )}

      {/* Résultat */}
      {entry && stateIdx != null && (
        <View style={styles.result}>
          <Text style={styles.resultLabel}>Estimation de reprise</Text>
          <Text style={styles.resultPrice}>{price != null ? `${price} €` : "Nous consulter"}</Text>
          <Text style={styles.resultNote}>
            Estimation indicative, à confirmer après vérification de l'appareil.
          </Text>
          <TouchableOpacity style={styles.cta} onPress={demanderRachat}>
            <Text style={styles.ctaText}>Faire une demande de rachat</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

function Toggle({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.toggleBtn, active && styles.toggleActive]} onPress={onPress}>
      <Text style={[styles.toggleText, active && styles.toggleTextActive]}>{label}</Text>
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
  content: { padding: 18 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  h1: { fontSize: 23, fontWeight: "800", color: colors.text },
  sub: { fontSize: 14, color: colors.muted, marginTop: 6, marginBottom: 16 },
  toggle: { flexDirection: "row", gap: 10, marginBottom: 8 },
  toggleBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.card, alignItems: "center" },
  toggleActive: { backgroundColor: colors.primary },
  toggleText: { fontWeight: "700", color: colors.text },
  toggleTextActive: { color: "#fff" },
  label: { fontSize: 15, fontWeight: "800", color: colors.text, marginTop: 20, marginBottom: 10 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18, backgroundColor: colors.card, marginRight: 8, marginBottom: 8 },
  chipActive: { backgroundColor: colors.primary },
  chipText: { color: colors.text, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  modelRow: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 13, marginBottom: 8, backgroundColor: "#fff" },
  modelActive: { borderColor: colors.primary, backgroundColor: "#e3efe8" },
  modelTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  modelTitleActive: { color: colors.primary, fontWeight: "800" },
  modelDetail: { fontSize: 13, color: colors.muted, marginTop: 2 },
  stateCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, marginBottom: 10, backgroundColor: "#fff" },
  stateActive: { borderColor: colors.primary, backgroundColor: "#e3efe8" },
  stateTitle: { fontSize: 15, fontWeight: "800", color: colors.text },
  stateTitleActive: { color: colors.primary },
  stateDesc: { fontSize: 13, color: colors.muted, marginTop: 4, lineHeight: 18 },
  result: { marginTop: 22, backgroundColor: colors.primary, borderRadius: 16, padding: 20, alignItems: "center" },
  resultLabel: { color: "#d6e6dc", fontSize: 14, fontWeight: "600" },
  resultPrice: { color: "#fff", fontSize: 36, fontWeight: "900", marginTop: 4 },
  resultNote: { color: "#d6e6dc", fontSize: 12, textAlign: "center", marginTop: 8 },
  cta: { marginTop: 16, backgroundColor: colors.accent, borderRadius: 24, paddingHorizontal: 22, paddingVertical: 13 },
  ctaText: { color: colors.accentText, fontWeight: "800", fontSize: 15 },
});
