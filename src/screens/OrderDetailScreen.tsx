import React from "react";
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  financialLabel,
  fulfillmentLabel,
  type CustomerOrder,
} from "../lib/orders";
import type { OrderDetailProps } from "../navigation";
import { colors, formatMoney } from "../theme";

function money(v: string | number | null, currency: string): string {
  if (v == null) return "—";
  return formatMoney(String(v), currency);
}

export function OrderDetailScreen({ route }: OrderDetailProps) {
  const order: CustomerOrder = route.params.order;
  const f = fulfillmentLabel(order.fulfillmentStatus);
  const paid = (order.financialStatus || "").toLowerCase() === "paid";

  // Chronologie de suivi
  const steps = [
    { label: "Commande reçue", done: true },
    { label: "Paiement confirmé", done: paid },
    { label: "En préparation", done: paid },
    { label: "Expédiée", done: f.step >= 4 },
    { label: "Livrée", done: f.step >= 5 },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.orderName}>{order.orderName}</Text>
        {order.date ? (
          <Text style={styles.date}>
            Passée le {new Date(order.date).toLocaleDateString("fr-FR")}
          </Text>
        ) : null}
        <View style={styles.badges}>
          <Text style={[styles.badge, styles.badgeGreen]}>{f.label}</Text>
          <Text style={[styles.badge, paid ? styles.badgeGold : styles.badgeGrey]}>
            {financialLabel(order.financialStatus)}
          </Text>
        </View>
      </View>

      {/* Chronologie */}
      <Text style={styles.sectionTitle}>Suivi</Text>
      <View style={styles.timeline}>
        {steps.map((s, i) => (
          <View key={i} style={styles.step}>
            <View style={styles.stepColumn}>
              <View style={[styles.dot, s.done ? styles.dotDone : styles.dotTodo]}>
                {s.done && <Text style={styles.dotCheck}>✓</Text>}
              </View>
              {i < steps.length - 1 && (
                <View style={[styles.line, steps[i + 1].done && styles.lineDone]} />
              )}
            </View>
            <Text style={[styles.stepLabel, s.done && styles.stepLabelDone]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Livraison / suivi colis */}
      {order.tracking.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Livraison</Text>
          {order.tracking.map((t, i) => (
            <View key={i} style={styles.trackCard}>
              {t.carrier ? <Text style={styles.carrier}>{t.carrier}</Text> : null}
              {t.trackingNumber ? (
                <Text style={styles.trackNum}>N° de suivi : {t.trackingNumber}</Text>
              ) : null}
              {t.trackingUrl ? (
                <TouchableOpacity
                  style={styles.trackBtn}
                  onPress={() => Linking.openURL(t.trackingUrl!)}
                >
                  <Text style={styles.trackBtnText}>Suivre mon colis</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))}
        </>
      )}

      {/* Articles */}
      <Text style={styles.sectionTitle}>Articles</Text>
      <View style={styles.itemsCard}>
        {order.lineItems.length === 0 ? (
          <Text style={styles.muted}>Détail indisponible.</Text>
        ) : (
          order.lineItems.map((li, i) => (
            <View key={i} style={styles.itemRow}>
              <Text style={styles.itemName} numberOfLines={2}>
                {li.quantity}× {li.name}
              </Text>
              <Text style={styles.itemPrice}>{money(li.price, order.currency)}</Text>
            </View>
          ))
        )}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{money(order.total, order.currency)}</Text>
        </View>
      </View>

      {order.statusUrl ? (
        <TouchableOpacity style={styles.shopifyBtn} onPress={() => Linking.openURL(order.statusUrl!)}>
          <Text style={styles.shopifyText}>Voir la page de suivi détaillée</Text>
        </TouchableOpacity>
      ) : null}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 18 },
  header: { marginBottom: 8 },
  orderName: { fontSize: 24, fontWeight: "900", color: colors.text },
  date: { fontSize: 13, color: colors.muted, marginTop: 4 },
  badges: { flexDirection: "row", gap: 8, marginTop: 12 },
  badge: { fontSize: 12, fontWeight: "700", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, overflow: "hidden" },
  badgeGreen: { backgroundColor: colors.primary, color: "#fff" },
  badgeGold: { backgroundColor: colors.accent, color: colors.accentText },
  badgeGrey: { backgroundColor: colors.card, color: colors.muted },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: colors.text, marginTop: 24, marginBottom: 12 },
  timeline: {},
  step: { flexDirection: "row", alignItems: "flex-start" },
  stepColumn: { alignItems: "center", width: 30 },
  dot: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  dotDone: { backgroundColor: colors.primary },
  dotTodo: { backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border },
  dotCheck: { color: "#fff", fontSize: 13, fontWeight: "800" },
  line: { width: 2, height: 26, backgroundColor: colors.border },
  lineDone: { backgroundColor: colors.primary },
  stepLabel: { fontSize: 15, color: colors.muted, marginLeft: 12, marginTop: 1, fontWeight: "600" },
  stepLabelDone: { color: colors.text },
  trackCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, marginBottom: 10, backgroundColor: colors.card },
  carrier: { fontSize: 15, fontWeight: "700", color: colors.text },
  trackNum: { fontSize: 13, color: colors.muted, marginTop: 4 },
  trackBtn: { marginTop: 12, backgroundColor: colors.accent, borderRadius: 8, paddingVertical: 11, alignItems: "center" },
  trackBtnText: { color: colors.accentText, fontWeight: "700" },
  itemsCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, backgroundColor: "#fff" },
  itemRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10, gap: 10 },
  itemName: { flex: 1, fontSize: 14, color: colors.text },
  itemPrice: { fontSize: 14, fontWeight: "700", color: colors.text },
  muted: { color: colors.muted },
  totalRow: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 4 },
  totalLabel: { fontSize: 15, fontWeight: "700", color: colors.text },
  totalValue: { fontSize: 18, fontWeight: "900", color: colors.primary },
  shopifyBtn: { marginTop: 18, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  shopifyText: { color: colors.text, fontWeight: "600" },
});
