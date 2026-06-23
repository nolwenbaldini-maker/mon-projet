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

function distinct(values: (string | null | undefined)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => !!v)));
}

export function EstimerScreen() {
  const navigation = useNavigation<any>();
  const [kind, setKind] = useState<Kind>("smartphone");
  const [phones, setPhones] = useState<ArgusSmartphone[]>([]);
  const [consoles, setConsoles] = useState<ArgusConsole[]>([]);
  const [loading, setLoading] = useState(true);

  const [brand, setBrand] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [capacity, setCapacity] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
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

  function resetFrom(level: "kind" | "brand" | "model" | "capacity" | "color") {
    if (level === "kind") setBrand(null);
    if (level === "kind" || level === "brand") setModel(null);
    if (level !== "capacity" && level !== "color") setCapacity(null);
    if (level !== "color") setColor(null);
    setStateIdx(null);
  }

  // Lignes argus selon le type
  const rows = kind === "smartphone" ? phones : consoles;

  const brands = useMemo(() => distinct(rows.map((r) => r.brand)).sort(), [rows]);
  const models = useMemo(
    () => distinct(rows.filter((r) => r.brand === brand).map((r) => r.model)).sort(),
    [rows, brand]
  );
  const capacities = useMemo(
    () =>
      distinct(
        rows.filter((r) => r.brand === brand && r.model === model).map((r) => r.capacity)
      ),
    [rows, brand, model]
  );
  const colors_ = useMemo(
    () =>
      kind === "smartphone"
        ? distinct(
            (rows as ArgusSmartphone[])
              .filter((r) => r.brand === brand && r.model === model && r.capacity === capacity)
              .map((r) => r.color)
          )
        : [],
    [rows, brand, model, capacity, kind]
  );

  // Ligne sélectionnée
  const selected = useMemo(() => {
    return rows.find(
      (r) =>
        r.brand === brand &&
        r.model === model &&
        (capacity ? r.capacity === capacity : true) &&
        (kind === "smartphone" && color ? (r as ArgusSmartphone).color === color : true)
    );
  }, [rows, brand, model, capacity, color, kind]);

  const needCapacity = capacities.length > 0;
  const needColor = kind === "smartphone" && colors_.length > 0;
  const capacityReady = !needCapacity || !!capacity;
  const colorReady = !needColor || !!color;
  const canChooseState = !!model && capacityReady && colorReady;

  const price =
    selected && stateIdx != null ? (selected as any)[ESTIMATION_STATES[stateIdx].priceKey] : null;

  function demanderRachat() {
    if (!selected || stateIdx == null) return;
    const st = ESTIMATION_STATES[stateIdx];
    const parts = [brand, model, capacity, kind === "smartphone" ? color : null].filter(Boolean);
    const estim = price != null ? ` — estimation ${price} €` : "";
    navigation.navigate("RachatRequest", {
      prefill: `${parts.join(" ")} (${st.label})${estim}`,
    });
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
      <Text style={styles.sub}>Choisis ton appareil, on te donne le prix de reprise.</Text>

      {/* Type */}
      <View style={styles.toggle}>
        <Toggle label="📱 Smartphone" active={kind === "smartphone"} onPress={() => { setKind("smartphone"); resetFrom("kind"); }} />
        <Toggle label="🎮 Console" active={kind === "console"} onPress={() => { setKind("console"); resetFrom("kind"); }} />
      </View>

      <Step n="1" title="Marque" done={!!brand}>
        <View style={styles.wrap}>
          {brands.map((b) => (
            <Chip key={b} label={b} active={brand === b} onPress={() => { setBrand(b); resetFrom("brand"); }} />
          ))}
        </View>
      </Step>

      {brand && (
        <Step n="2" title="Modèle" done={!!model}>
          <View style={styles.wrap}>
            {models.map((m) => (
              <Chip key={m} label={m} active={model === m} onPress={() => { setModel(m); resetFrom("model"); }} big />
            ))}
          </View>
        </Step>
      )}

      {model && needCapacity && (
        <Step n="3" title="Stockage" done={!!capacity}>
          <View style={styles.wrap}>
            {capacities.map((c) => (
              <Chip key={c} label={c} active={capacity === c} onPress={() => { setCapacity(c); resetFrom("capacity"); }} />
            ))}
          </View>
        </Step>
      )}

      {model && capacityReady && needColor && (
        <Step n="4" title="Couleur" done={!!color}>
          <View style={styles.wrap}>
            {colors_.map((c) => (
              <Chip key={c} label={c} active={color === c} onPress={() => { setColor(c); setStateIdx(null); }} />
            ))}
          </View>
        </Step>
      )}

      {canChooseState && (
        <Step n={needColor ? "5" : needCapacity ? "4" : "3"} title="État" done={stateIdx != null}>
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
        </Step>
      )}

      {canChooseState && stateIdx != null && (
        <View style={styles.result}>
          <Text style={styles.resultLabel}>Estimation de reprise</Text>
          <Text style={styles.resultPrice}>{price != null ? `${price} €` : "Nous consulter"}</Text>
          <Text style={styles.resultNote}>Estimation indicative, à confirmer après vérification.</Text>
          <TouchableOpacity style={styles.cta} onPress={demanderRachat}>
            <Text style={styles.ctaText}>Faire une demande de rachat</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

function Step({ n, title, done, children }: { n: string; title: string; done: boolean; children: React.ReactNode }) {
  return (
    <View style={styles.step}>
      <Text style={styles.stepTitle}>
        <Text style={[styles.stepNum, done && styles.stepNumDone]}>{done ? "✓" : n}</Text>  {title}
      </Text>
      {children}
    </View>
  );
}

function Toggle({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.toggleBtn, active && styles.toggleActive]} onPress={onPress}>
      <Text style={[styles.toggleText, active && styles.toggleTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Chip({ label, active, onPress, big }: { label: string; active: boolean; onPress: () => void; big?: boolean }) {
  return (
    <TouchableOpacity style={[styles.chip, big && styles.chipBig, active && styles.chipActive]} onPress={onPress}>
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
  step: { marginTop: 22 },
  stepTitle: { fontSize: 16, fontWeight: "800", color: colors.text, marginBottom: 12 },
  stepNum: {
    color: colors.muted,
    fontWeight: "900",
  },
  stepNumDone: { color: colors.primary },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18, backgroundColor: colors.card, marginRight: 8, marginBottom: 8 },
  chipBig: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  chipActive: { backgroundColor: colors.primary },
  chipText: { color: colors.text, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  stateCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, marginBottom: 10, backgroundColor: "#fff" },
  stateActive: { borderColor: colors.primary, backgroundColor: "#e3efe8" },
  stateTitle: { fontSize: 15, fontWeight: "800", color: colors.text },
  stateTitleActive: { color: colors.primary },
  stateDesc: { fontSize: 13, color: colors.muted, marginTop: 4, lineHeight: 18 },
  result: { marginTop: 24, backgroundColor: colors.primary, borderRadius: 16, padding: 20, alignItems: "center" },
  resultLabel: { color: "#d6e6dc", fontSize: 14, fontWeight: "600" },
  resultPrice: { color: "#fff", fontSize: 36, fontWeight: "900", marginTop: 4 },
  resultNote: { color: "#d6e6dc", fontSize: 12, textAlign: "center", marginTop: 8 },
  cta: { marginTop: 16, backgroundColor: colors.accent, borderRadius: 24, paddingHorizontal: 22, paddingVertical: 13 },
  ctaText: { color: colors.accentText, fontWeight: "800", fontSize: 15 },
});
