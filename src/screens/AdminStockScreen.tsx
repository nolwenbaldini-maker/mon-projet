import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  getStockInfo,
  saveStockPrice,
  searchAdminProducts,
  type AdminProduct,
  type StockInfo,
} from "../lib/stock";
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
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [saving, setSaving] = useState(false);

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
    setLoadingInfo(true);
    try {
      const i = await getStockInfo(p.id);
      // À défaut de prix renvoyé par la fonction, on retombe sur celui de la liste.
      if (i.price == null && p.price != null) i.price = Number(p.price);
      setInfo(i);
    } catch {
      setInfo(null);
    } finally {
      setLoadingInfo(false);
    }
  }

  async function save(stock: number, price: number | null) {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await saveStockPrice(editing.id, stock, price);
      const newAvail = res.available ?? stock;
      const newPrice = res.price != null ? String(res.price) : editing.price;
      setProducts((prev) =>
        prev.map((p) =>
          p.id === editing.id
            ? { ...p, availableForSale: newAvail > 0, price: newPrice }
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
                    <Text style={styles.price}>{priceLabel(item.price)}</Text>
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
            <Text style={styles.modalTitle} numberOfLines={2}>{editing?.title}</Text>
            {editing?.condition ? (
              <Text style={styles.modalSub}>État : {editing.condition}</Text>
            ) : null}

            {loadingInfo ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
            ) : info === null ? (
              <Text style={styles.modalErr}>
                Stock indisponible. La fonction « manage-stock » est-elle déployée côté Lovable ?
              </Text>
            ) : (
              <StockEditor
                initialStock={info.available ?? 0}
                stockKnown={info.available !== null}
                initialPrice={info.price}
                saving={saving}
                onSave={save}
              />
            )}

            <TouchableOpacity style={styles.cancel} onPress={() => setEditing(null)}>
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
  saving,
  onSave,
}: {
  initialStock: number;
  stockKnown: boolean;
  initialPrice: number | null;
  saving: boolean;
  onSave: (stock: number, price: number | null) => void;
}) {
  const [val, setVal] = useState(initialStock);
  const [price, setPrice] = useState(initialPrice != null ? String(initialPrice) : "");

  function parsedPrice(): number | null {
    const t = price.trim().replace(",", ".");
    if (!t) return null;
    const n = Number(t);
    return Number.isNaN(n) ? null : n;
  }

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
        onPress={() => onSave(val, parsedPrice())}
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
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 3 },
  price: { fontSize: 14, fontWeight: "800", color: colors.primary },
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
  modalCard: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 22 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  modalSub: { fontSize: 13, color: colors.muted, marginTop: 4 },
  modalErr: { color: "#dc2626", marginVertical: 20, lineHeight: 20 },
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
