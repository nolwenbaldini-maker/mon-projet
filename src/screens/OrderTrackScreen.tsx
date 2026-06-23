import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { getOrderStatus } from "../lib/orders";
import { colors } from "../theme";

export function OrderTrackScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [orderNumber, setOrderNumber] = useState("");
  const [contact, setContact] = useState(user?.email ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function track() {
    setError(null);
    if (!orderNumber.trim() || !contact.trim()) {
      setError("Indique le numéro de commande et ton email (ou téléphone).");
      return;
    }
    setBusy(true);
    try {
      const order = await getOrderStatus(orderNumber.trim(), contact.trim());
      navigation.navigate("OrderDetail", { order });
    } catch (e: any) {
      setError(e.message ?? "Commande introuvable.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.h1}>Suivre une commande</Text>
        <Text style={styles.sub}>
          Entre ton numéro de commande et l'email (ou téléphone) utilisé lors de l'achat.
        </Text>

        <Text style={styles.label}>Numéro de commande</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex : 1042 ou #1042"
          placeholderTextColor={colors.muted}
          value={orderNumber}
          onChangeText={setOrderNumber}
        />

        <Text style={styles.label}>Email ou téléphone</Text>
        <TextInput
          style={styles.input}
          placeholder="ton@email.fr"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          value={contact}
          onChangeText={setContact}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.btn} onPress={track} disabled={busy}>
          {busy ? <ActivityIndicator color={colors.accentText} /> : <Text style={styles.btnText}>Suivre ma commande</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20 },
  h1: { fontSize: 23, fontWeight: "800", color: colors.text },
  sub: { fontSize: 14, color: colors.muted, marginTop: 6, marginBottom: 8, lineHeight: 20 },
  label: { fontSize: 14, fontWeight: "700", color: colors.text, marginTop: 18, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    backgroundColor: "#fff",
  },
  error: { color: "#dc2626", marginTop: 14 },
  btn: { backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 15, alignItems: "center", marginTop: 26 },
  btnText: { color: colors.accentText, fontWeight: "800", fontSize: 16 },
});
