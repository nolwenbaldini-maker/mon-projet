import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  diagStock,
  getStockInfo,
  saveStockPrice,
  searchAdminProducts,
  type AdminProduct,
  type SaveOptions,
  type StockInfo,
} from "../lib/stock";
import {
  cancelScheduledPromo,
  formatDateTime,
  listScheduledPromos,
  parseDateTime,
  schedulePromo,
  type ScheduledPromo,
} from "../lib/promoSchedule";
import { colors, formatMoney } from "../theme";

/** Affiche le prix d'un produit (chaîne brute Storefront) en euros. */
function priceLabel(price: string | null): string {
  if (price == null) return "—";
  return formatMoney(price, "EUR");
}

/** Petites infos pour différencier deux produits identiques (état, type, autres balises). */
function subInfo(p: AdminProduct): string {
  const parts: string[] = [];
  if (p.productType) parts.push(p.productType);
  // balises restantes (hors état déjà affiché en pastille)
  const extra = p.tags.filter(
    (t) => t && t.toLowerCase() !== (p.condition ?? "").toLowerCase()
  );
  parts.push(...extra.slice(0, 3));
  return parts.join(" · ");
}

export function AdminStockScreen() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Éditeur (modal)
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [info, setInfo] = useState<StockInfo | null>(null);
  const [infoErr, setInfoErr] = useState<string | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [saving, setSaving] = useState(false);

  // Diagnostic (test du jeton Shopify) — toujours accessible
  const [diagText, setDiagText] = useState<string | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);

  async function runDiag() {
    setDiagLoading(true);
    setDiagText("");
    try {
      setDiagText(await diagStock());
    } catch (e: any) {
      setDiagText(e?.message ?? "Diagnostic indisponible.");
    } finally {
      setDiagLoading(false);
    }
  }

  async function search() {
    setLoading(true);
    setSearched(true);
    try {
      setProducts(await searchAdminProducts(query.trim()));
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  async function openEditor(p: AdminProduct) {
    setEditing(p);
    setInfo(null);
    setInfoErr(null);
    setLoadingInfo(true);
    try {
      const i = await getStockInfo(p.id);
      // À défaut de prix renvoyé par la fonction, on retombe sur celui de la liste.
      if (i.price == null && p.price != null) i.price = Number(p.price);
      setInfo(i);
    } catch (e: any) {
      setInfo(null);
      const base = e?.message ?? "Erreur inconnue";
      // Diagnostic auto pour aider à corriger la config côté Lovable.
      const diag = await diagStock();
      setInfoErr(`${base}\n\n— Diagnostic —\n${diag}`);
    } finally {
      setLoadingInfo(false);
    }
  }

  async function save(stock: number, opts: SaveOptions) {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await saveStockPrice(editing.id, stock, opts);
      const newAvail = res.available ?? stock;
      const newPrice = res.price != null ? String(res.price) : editing.price;
      const newCompare = res.compareAtPrice != null ? String(res.compareAtPrice) : null;
      setProducts((prev) =>
        prev.map((p) =>
          p.id === editing.id
            ? {
                ...p,
                availableForSale: newAvail > 0,
                price: newPrice,
                compareAtPrice: newCompare,
                promoPercent: res.promoPercent,
              }
            : p
        )
      );
      setEditing(null);
    } catch (e: any) {
      alert(e.message ?? "Échec de la mise à jour.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.search}
          placeholder="Rechercher un produit…"
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={search}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={search}>
          <Text style={styles.searchBtnText}>OK</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.diagBtn} onPress={runDiag}>
        <Text style={styles.diagBtnText}>🔧 Diagnostic du jeton Shopify</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p) => p.gid}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            searched ? (
              <Text style={styles.empty}>Aucun produit trouvé.</Text>
            ) : (
              <Text style={styles.empty}>Cherche un produit pour gérer son stock et son prix.</Text>
            )
          }
          renderItem={({ item }) => {
            const sub = subInfo(item);
            return (
              <TouchableOpacity style={styles.row} onPress={() => openEditor(item)}>
                {item.image ? (
                  <Image source={{ uri: item.image }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.noThumb]} />
                )}
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle} numberOfLines={2}>{item.title}</Text>
                  <View style={styles.metaRow}>
                    <Text style={[styles.price, item.promoPercent > 0 && styles.pricePromo]}>
                      {priceLabel(item.price)}
                    </Text>
                    {item.promoPercent > 0 && item.compareAtPrice ? (
                      <Text style={styles.strike}>{priceLabel(item.compareAtPrice)}</Text>
                    ) : null}
                    {item.promoPercent > 0 ? (
                      <Text style={styles.promoBadge}>-{item.promoPercent}%</Text>
                    ) : null}
                    {item.condition ? (
                      <Text style={styles.condition}>{item.condition}</Text>
                    ) : null}
                  </View>
                  {sub ? <Text style={styles.sub} numberOfLines={1}>{sub}</Text> : null}
                </View>
                <Text style={[styles.badge, item.availableForSale ? styles.dispo : styles.rupture]}>
                  {item.availableForSale ? "En vente" : "Rupture"}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Éditeur de stock + prix */}
      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <ScrollView keyboardShouldPersistTaps="handled" style={styles.editorScroll}>
              <Text style={styles.modalTitle} numberOfLines={2}>{editing?.title}</Text>
              {editing?.condition ? (
                <Text style={styles.modalSub}>État : {editing.condition}</Text>
              ) : null}

              {loadingInfo ? (
                <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
              ) : info === null ? (
                <>
                  <Text style={styles.modalErr}>
                    Stock indisponible. La fonction « manage-stock » a renvoyé une erreur :
                  </Text>
                  <Text style={styles.modalErrDetail}>{infoErr ?? "erreur inconnue"}</Text>
                </>
              ) : (
                <StockEditor
                  initialStock={info.available ?? 0}
                  stockKnown={info.available !== null}
                  initialPrice={info.price}
                  initialPromo={info.promoPercent}
                  compareAt={info.compareAtPrice}
                  saving={saving}
                  onSave={save}
                />
              )}

              {/* Programmation de promo (début / fin) */}
              {editing && <ScheduleSection product={editing} />}
            </ScrollView>

            <TouchableOpacity style={styles.cancel} onPress={() => setEditing(null)}>
              <Text style={styles.cancelText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Diagnostic du jeton Shopify (déroulant, toujours lisible en entier) */}
      <Modal
        visible={diagText !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setDiagText(null)}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🔧 Diagnostic du jeton</Text>
            <Text style={styles.modalSub}>
              Recopie le bloc « test du jeton sur Shopify » et envoie-le pour débloquer.
            </Text>
            {diagLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 30 }} />
            ) : (
              <ScrollView style={styles.diagScroll}>
                <Text selectable style={styles.diagResult}>
                  {diagText || "—"}
                </Text>
              </ScrollView>
            )}
            <TouchableOpacity style={styles.cancel} onPress={() => setDiagText(null)}>
              <Text style={styles.cancelText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function StockEditor({
  initialStock,
  stockKnown,
  initialPrice,
  initialPromo,
  compareAt,
  saving,
  onSave,
}: {
  initialStock: number;
  stockKnown: boolean;
  initialPrice: number | null;
  initialPromo: number;
  compareAt: number | null;
  saving: boolean;
  onSave: (stock: number, opts: SaveOptions) => void;
}) {
  const [val, setVal] = useState(initialStock);
  const [price, setPrice] = useState(initialPrice != null ? String(initialPrice) : "");
  const [promo, setPromo] = useState(initialPromo > 0 ? String(initialPromo) : "");
  const onPromo = initialPromo > 0;

  function parsedPrice(): number | null {
    const t = price.trim().replace(",", ".");
    if (!t) return null;
    const n = Number(t);
    return Number.isNaN(n) ? null : n;
  }
  function parsedPromo(): number | null {
    const t = promo.trim().replace(",", ".");
    if (!t) return null;
    const n = Number(t);
    return Number.isNaN(n) ? null : Math.min(95, Math.max(0, n));
  }

  // Aperçu du prix promo (prix saisi × (1 − %)).
  const base = parsedPrice() ?? initialPrice ?? 0;
  const pct = parsedPromo() ?? 0;
  const previewPromoPrice = pct > 0 ? Math.round(base * (1 - pct / 100) * 100) / 100 : null;

  return (
    <>
      <Text style={styles.fieldLabel}>Prix (€)</Text>
      <TextInput
        style={styles.priceInput}
        keyboardType="decimal-pad"
        placeholder="0.00"
        placeholderTextColor={colors.muted}
        value={price}
        onChangeText={(t) => setPrice(t.replace(/[^0-9.,]/g, ""))}
      />

      {/* Promotion */}
      <Text style={styles.fieldLabel}>Promotion (%)</Text>
      {onPromo && (
        <Text style={styles.promoCurrent}>
          En promo : -{initialPromo}%{compareAt != null ? ` (prix barré ${formatMoney(String(compareAt), "EUR")})` : ""}
        </Text>
      )}
      <View style={styles.promoRow}>
        <TextInput
          style={styles.promoInput}
          keyboardType="number-pad"
          placeholder="ex : 20"
          placeholderTextColor={colors.muted}
          value={promo}
          onChangeText={(t) => setPromo(t.replace(/[^0-9]/g, ""))}
        />
        <Text style={styles.promoPct}>%</Text>
        {previewPromoPrice != null && (
          <Text style={styles.promoPreview}>→ {formatMoney(String(previewPromoPrice), "EUR")}</Text>
        )}
      </View>
      {onPromo && (
        <TouchableOpacity
          style={styles.removePromoBtn}
          onPress={() => onSave(val, { removePromo: true })}
          disabled={saving}
        >
          <Text style={styles.removePromoText}>Retirer la promo</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.fieldLabel}>Stock {stockKnown ? "" : "(non suivi pour l'instant)"}</Text>
      <View style={styles.stepper}>
        <TouchableOpacity style={styles.stepBtn} onPress={() => setVal((v) => Math.max(0, v - 1))}>
          <Text style={styles.stepText}>−</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.stockInput}
          keyboardType="number-pad"
          value={String(val)}
          onChangeText={(t) => setVal(Math.max(0, Number(t.replace(/[^0-9]/g, "")) || 0))}
        />
        <TouchableOpacity style={styles.stepBtn} onPress={() => setVal((v) => v + 1)}>
          <Text style={styles.stepText}>+</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.ruptureBtn} onPress={() => setVal(0)}>
        <Text style={styles.ruptureText}>Mettre en rupture (0) — disparaît du site</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.saveBtn}
        onPress={() => {
          const p = parsedPromo();
          onSave(val, { price: parsedPrice(), promoPercent: p && p > 0 ? p : null });
        }}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color={colors.accentText} />
        ) : (
          <Text style={styles.saveText}>Enregistrer</Text>
        )}
      </TouchableOpacity>
    </>
  );
}

/** Programmation d'une promo (début / fin) appliquée automatiquement côté serveur. */
function ScheduleSection({ product }: { product: AdminProduct }) {
  const [percent, setPercent] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [list, setList] = useState<ScheduledPromo[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function reload() {
    try {
      setList(await listScheduledPromos(product.id));
      setErr(null);
    } catch (e: any) {
      setErr(e?.message ?? "Impossible de charger les promos programmées.");
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  async function submit() {
    const p = Number(percent);
    if (!p || p <= 0 || p > 95) {
      setErr("Entre un pourcentage valide (1 à 95).");
      return;
    }
    const start = parseDateTime(startDate, startTime);
    const end = parseDateTime(endDate, endTime);
    if (!start || !end) {
      setErr("Dates invalides. Format : JJ/MM/AAAA et HH:MM.");
      return;
    }
    if (end <= start) {
      setErr("La fin doit être après le début.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await schedulePromo(product.id, product.title, p, start, end);
      setPercent("");
      setStartDate("");
      setStartTime("");
      setEndDate("");
      setEndTime("");
      await reload();
    } catch (e: any) {
      setErr(e?.message ?? "Échec de la programmation.");
    } finally {
      setBusy(false);
    }
  }

  async function cancel(id: string) {
    setBusy(true);
    try {
      await cancelScheduledPromo(id);
      await reload();
    } catch (e: any) {
      setErr(e?.message ?? "Échec de l'annulation.");
    } finally {
      setBusy(false);
    }
  }

  const statusLabel: Record<ScheduledPromo["status"], string> = {
    scheduled: "⏳ Programmée",
    active: "🔴 En cours",
    done: "✅ Terminée",
    cancelled: "Annulée",
    error: "⚠️ Erreur",
  };

  return (
    <View style={styles.schedBox}>
      <Text style={styles.schedTitle}>⏰ Programmer une promo</Text>
      <Text style={styles.schedHint}>
        Elle s'appliquera et se retirera toute seule (sur l'app et le site) aux dates choisies.
      </Text>

      <Text style={styles.schedLabel}>Réduction (%)</Text>
      <TextInput
        style={styles.schedInput}
        keyboardType="number-pad"
        placeholder="ex : 20"
        placeholderTextColor={colors.muted}
        value={percent}
        onChangeText={(t) => setPercent(t.replace(/[^0-9]/g, ""))}
      />

      <Text style={styles.schedLabel}>Début</Text>
      <View style={styles.schedRow}>
        <TextInput
          style={[styles.schedInput, styles.schedFlex]}
          placeholder="JJ/MM/AAAA"
          placeholderTextColor={colors.muted}
          value={startDate}
          onChangeText={(t) => setStartDate(t.replace(/[^0-9/]/g, ""))}
        />
        <TextInput
          style={[styles.schedInput, styles.schedTime]}
          placeholder="HH:MM"
          placeholderTextColor={colors.muted}
          value={startTime}
          onChangeText={(t) => setStartTime(t.replace(/[^0-9:]/g, ""))}
        />
      </View>

      <Text style={styles.schedLabel}>Fin</Text>
      <View style={styles.schedRow}>
        <TextInput
          style={[styles.schedInput, styles.schedFlex]}
          placeholder="JJ/MM/AAAA"
          placeholderTextColor={colors.muted}
          value={endDate}
          onChangeText={(t) => setEndDate(t.replace(/[^0-9/]/g, ""))}
        />
        <TextInput
          style={[styles.schedInput, styles.schedTime]}
          placeholder="HH:MM"
          placeholderTextColor={colors.muted}
          value={endTime}
          onChangeText={(t) => setEndTime(t.replace(/[^0-9:]/g, ""))}
        />
      </View>

      {err ? <Text style={styles.schedErr}>{err}</Text> : null}

      <TouchableOpacity style={styles.schedBtn} onPress={submit} disabled={busy}>
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.schedBtnText}>Programmer</Text>
        )}
      </TouchableOpacity>

      {list.length > 0 && (
        <View style={{ marginTop: 14 }}>
          <Text style={styles.schedLabel}>Promos programmées</Text>
          {list.map((s) => (
            <View key={s.id} style={styles.schedItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.schedItemTitle}>
                  -{s.percent}% · {statusLabel[s.status]}
                </Text>
                <Text style={styles.schedItemDates}>
                  {formatDateTime(s.starts_at)} → {formatDateTime(s.ends_at)}
                </Text>
                {s.last_error ? <Text style={styles.schedErr}>{s.last_error}</Text> : null}
              </View>
              {(s.status === "scheduled" || s.status === "active") && (
                <TouchableOpacity onPress={() => cancel(s.id)} disabled={busy}>
                  <Text style={styles.schedCancel}>Annuler</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchRow: { flexDirection: "row", gap: 8, padding: 12 },
  search: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: colors.text,
    backgroundColor: "#fff",
  },
  searchBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 18, justifyContent: "center" },
  searchBtnText: { color: "#fff", fontWeight: "700" },
  diagBtn: { marginHorizontal: 12, marginBottom: 8, alignSelf: "flex-start" },
  diagBtnText: { color: colors.muted, fontWeight: "700", fontSize: 13, textDecorationLine: "underline" },
  diagScroll: { maxHeight: 320, marginTop: 14, backgroundColor: "#f1f5f2", borderRadius: 10, padding: 12 },
  diagResult: { fontFamily: "monospace", fontSize: 13, color: colors.text, lineHeight: 20 },
  list: { padding: 12, paddingTop: 0 },
  empty: { textAlign: "center", color: colors.muted, marginTop: 40 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  thumb: { width: 54, height: 54, borderRadius: 8, backgroundColor: colors.card },
  noThumb: { backgroundColor: colors.card },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: "600", color: colors.text },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 3, flexWrap: "wrap" },
  price: { fontSize: 14, fontWeight: "800", color: colors.primary },
  pricePromo: { color: "#dc2626" },
  strike: { fontSize: 12, color: colors.muted, textDecorationLine: "line-through" },
  promoBadge: {
    fontSize: 11,
    fontWeight: "800",
    color: "#fff",
    backgroundColor: "#dc2626",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 7,
    overflow: "hidden",
  },
  condition: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.accentText,
    backgroundColor: colors.accent,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: "hidden",
  },
  sub: { fontSize: 11, color: colors.muted, marginTop: 3 },
  badge: { fontSize: 11, fontWeight: "700", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, overflow: "hidden" },
  dispo: { backgroundColor: "#e3efe8", color: colors.primary },
  rupture: { backgroundColor: "#fde8e8", color: "#dc2626" },

  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 22, maxHeight: "90%" },
  editorScroll: { flexGrow: 0 },
  schedBox: { marginTop: 20, paddingTop: 18, borderTopWidth: 1, borderTopColor: colors.border },
  schedTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
  schedHint: { fontSize: 12, color: colors.muted, marginTop: 4, lineHeight: 17 },
  schedLabel: { fontSize: 13, fontWeight: "700", color: colors.muted, marginTop: 14, marginBottom: 6 },
  schedRow: { flexDirection: "row", gap: 10 },
  schedInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.text,
    backgroundColor: "#fff",
  },
  schedFlex: { flex: 1 },
  schedTime: { width: 90, textAlign: "center" },
  schedErr: { color: "#dc2626", fontSize: 13, marginTop: 8 },
  schedBtn: { marginTop: 16, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  schedBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  schedItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  schedItemTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  schedItemDates: { fontSize: 12, color: colors.muted, marginTop: 2 },
  schedCancel: { color: "#dc2626", fontWeight: "700", fontSize: 13 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  modalSub: { fontSize: 13, color: colors.muted, marginTop: 4 },
  modalErr: { color: "#dc2626", marginTop: 20, marginBottom: 6, lineHeight: 20 },
  modalErrDetail: {
    color: "#7f1d1d",
    backgroundColor: "#fde8e8",
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    fontFamily: "monospace",
    marginBottom: 14,
  },
  fieldLabel: { fontSize: 14, fontWeight: "700", color: colors.muted, marginTop: 18, marginBottom: 8 },
  priceInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    backgroundColor: "#fff",
  },
  promoCurrent: { color: "#dc2626", fontWeight: "700", fontSize: 13, marginBottom: 8 },
  promoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  promoInput: {
    width: 90,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    backgroundColor: "#fff",
    textAlign: "center",
  },
  promoPct: { fontSize: 18, fontWeight: "800", color: colors.muted },
  promoPreview: { fontSize: 15, fontWeight: "800", color: "#dc2626" },
  removePromoBtn: { marginTop: 10, alignSelf: "flex-start", paddingVertical: 6 },
  removePromoText: { color: colors.muted, fontWeight: "700", textDecorationLine: "underline" },
  stepper: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 4 },
  stepBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  stepText: { fontSize: 28, fontWeight: "800", color: colors.primary },
  stockInput: { minWidth: 80, textAlign: "center", fontSize: 30, fontWeight: "900", color: colors.text, borderBottomWidth: 2, borderBottomColor: colors.border },
  ruptureBtn: { marginTop: 20, borderWidth: 1, borderColor: "#dc2626", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  ruptureText: { color: "#dc2626", fontWeight: "700", fontSize: 13 },
  saveBtn: { marginTop: 12, backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 15, alignItems: "center" },
  saveText: { color: colors.accentText, fontWeight: "800", fontSize: 16 },
  cancel: { marginTop: 10, alignItems: "center", paddingVertical: 8 },
  cancelText: { color: colors.muted, fontWeight: "600" },
});
