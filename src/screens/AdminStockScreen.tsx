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
  getStock,
  searchAdminProducts,
  setStock,
  type AdminProduct,
} from "../lib/stock";
import { colors } from "../theme";

export function AdminStockScreen() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Éditeur (modal)
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [stock, setStockVal] = useState<number | null>(null);
  const [loadingStock, setLoadingStock] = useState(false);
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
    setStockVal(null);
    setLoadingStock(true);
    try {
      setStockVal(await getStock(p.id));
    } catch (e: any) {
      setStockVal(null);
    } finally {
      setLoadingStock(false);
    }
  }

  async function save(value: number) {
    if (!editing) return;
    setSaving(true);
    try {
      const newVal = await setStock(editing.id, value);
      // Met à jour la liste (dispo si > 0)
      setProducts((prev) =>
        prev.map((p) =>
          p.id === editing.id ? { ...p, availableForSale: newVal > 0 } : p
        )
      );
      setEditing(null);
    } catch (e: any) {
      setStockVal((v) => v); // garde la valeur
      alert(e.message ?? "Échec de la mise à jour du stock.");
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
              <Text style={styles.empty}>Cherche un produit pour gérer son stock.</Text>
            )
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.row} onPress={() => openEditor(item)}>
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.noThumb]} />
              )}
              <Text style={styles.rowTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={[styles.badge, item.availableForSale ? styles.dispo : styles.rupture]}>
                {item.availableForSale ? "En vente" : "Rupture"}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Éditeur de stock */}
      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle} numberOfLines={2}>{editing?.title}</Text>

            {loadingStock ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
            ) : stock === null ? (
              <Text style={styles.modalErr}>
                Stock indisponible. La fonction « manage-stock » est-elle déployée côté Lovable ?
              </Text>
            ) : (
              <StockEditor
                initial={stock}
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
  initial,
  saving,
  onSave,
}: {
  initial: number;
  saving: boolean;
  onSave: (v: number) => void;
}) {
  const [val, setVal] = useState(initial);
  return (
    <>
      <Text style={styles.stockLabel}>Stock actuel</Text>
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

      <TouchableOpacity style={styles.saveBtn} onPress={() => onSave(val)} disabled={saving}>
        {saving ? (
          <ActivityIndicator color={colors.accentText} />
        ) : (
          <Text style={styles.saveText}>Enregistrer ({val})</Text>
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
  thumb: { width: 50, height: 50, borderRadius: 8, backgroundColor: colors.card },
  noThumb: { backgroundColor: colors.card },
  rowTitle: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.text },
  badge: { fontSize: 11, fontWeight: "700", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, overflow: "hidden" },
  dispo: { backgroundColor: "#e3efe8", color: colors.primary },
  rupture: { backgroundColor: "#fde8e8", color: "#dc2626" },

  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 22 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  modalErr: { color: "#dc2626", marginVertical: 20, lineHeight: 20 },
  stockLabel: { fontSize: 14, fontWeight: "700", color: colors.muted, marginTop: 18, textAlign: "center" },
  stepper: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 10 },
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
