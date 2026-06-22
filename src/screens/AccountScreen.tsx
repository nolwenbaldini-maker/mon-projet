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
import type { CustomerOrder } from "../shopify/customer";
import { colors, formatMoney } from "../theme";

export function AccountScreen() {
  const { customer, initializing } = useAuth();

  if (initializing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return customer ? <Profile /> : <AuthForm />;
}

/* ------------------------- Connexion / Inscription ------------------------- */

function AuthForm() {
  const { login, signup, busy } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!email || !password) {
      setError("Renseigne ton email et ton mot de passe.");
      return;
    }
    try {
      if (mode === "login") await login(email, password);
      else await signup(email, password, firstName, lastName);
    } catch (e: any) {
      setError(e.message ?? "Une erreur est survenue.");
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.formTitle}>
          {mode === "login" ? "Connexion" : "Créer un compte"}
        </Text>
        <Text style={styles.formSubtitle}>
          {mode === "login"
            ? "Connecte-toi pour suivre tes commandes."
            : "Crée ton compte €ASH pour commander plus vite."}
        </Text>

        {mode === "signup" && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Prénom"
              placeholderTextColor={colors.muted}
              value={firstName}
              onChangeText={setFirstName}
            />
            <TextInput
              style={styles.input}
              placeholder="Nom"
              placeholderTextColor={colors.muted}
              value={lastName}
              onChangeText={setLastName}
            />
          </>
        )}
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
          placeholderTextColor={colors.muted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.primaryBtn} onPress={submit} disabled={busy}>
          {busy ? (
            <ActivityIndicator color={colors.accentText} />
          ) : (
            <Text style={styles.primaryBtnText}>
              {mode === "login" ? "Se connecter" : "Créer mon compte"}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switch}
          onPress={() => {
            setError(null);
            setMode(mode === "login" ? "signup" : "login");
          }}
        >
          <Text style={styles.switchText}>
            {mode === "login"
              ? "Pas encore de compte ? Créer un compte"
              : "Déjà un compte ? Se connecter"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ------------------------------- Profil ------------------------------------ */

function Profile() {
  const { customer, logout } = useAuth();
  if (!customer) return null;
  const name = [customer.firstName, customer.lastName].filter(Boolean).join(" ");

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.profile}>
      <View style={styles.profileHeader}>
        <Text style={styles.hello}>Bonjour {customer.firstName || ""} 👋</Text>
        <Text style={styles.email}>{customer.email}</Text>
      </View>

      <Text style={styles.sectionTitle}>Mes commandes</Text>
      {customer.orders.length === 0 ? (
        <Text style={styles.empty}>Tu n'as pas encore de commande.</Text>
      ) : (
        customer.orders.map((o) => <OrderCard key={o.id} order={o} />)
      )}

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function OrderCard({ order }: { order: CustomerOrder }) {
  const date = new Date(order.processedAt).toLocaleDateString("fr-FR");
  return (
    <View style={styles.order}>
      <View style={styles.orderTop}>
        <Text style={styles.orderName}>{order.name}</Text>
        <Text style={styles.orderTotal}>
          {formatMoney(order.total.amount, order.total.currencyCode)}
        </Text>
      </View>
      <Text style={styles.orderDate}>{date}</Text>
      <Text style={styles.orderStatus}>
        {translateFulfillment(order.fulfillmentStatus)} ·{" "}
        {translateFinancial(order.financialStatus)}
      </Text>
      <Text style={styles.orderItems} numberOfLines={2}>
        {order.lineItems.map((l) => `${l.quantity}× ${l.title}`).join(", ")}
      </Text>
    </View>
  );
}

function translateFulfillment(status: string | null): string {
  switch (status) {
    case "FULFILLED":
      return "Expédiée";
    case "IN_PROGRESS":
    case "PARTIALLY_FULFILLED":
      return "En préparation";
    case "UNFULFILLED":
      return "À préparer";
    default:
      return "En cours";
  }
}

function translateFinancial(status: string | null): string {
  switch (status) {
    case "PAID":
      return "Payée";
    case "PENDING":
      return "Paiement en attente";
    case "REFUNDED":
      return "Remboursée";
    default:
      return status ?? "";
  }
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },

  form: { padding: 20 },
  formTitle: { fontSize: 22, fontWeight: "800", color: colors.text },
  formSubtitle: { fontSize: 14, color: colors.muted, marginTop: 6, marginBottom: 18 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  error: { color: "#dc2626", marginBottom: 12 },
  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
  },
  primaryBtnText: { color: colors.accentText, fontWeight: "700", fontSize: 16 },
  switch: { alignItems: "center", marginTop: 18 },
  switchText: { color: colors.primary, fontWeight: "600" },

  profile: { padding: 20 },
  profileHeader: { marginBottom: 24 },
  hello: { fontSize: 22, fontWeight: "800", color: colors.text },
  email: { fontSize: 14, color: colors.muted, marginTop: 4 },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: colors.text, marginBottom: 12 },
  empty: { color: colors.muted },
  order: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    backgroundColor: colors.card,
  },
  orderTop: { flexDirection: "row", justifyContent: "space-between" },
  orderName: { fontSize: 15, fontWeight: "700", color: colors.text },
  orderTotal: { fontSize: 15, fontWeight: "800", color: colors.primary },
  orderDate: { fontSize: 12, color: colors.muted, marginTop: 2 },
  orderStatus: { fontSize: 13, color: colors.text, marginTop: 6, fontWeight: "600" },
  orderItems: { fontSize: 13, color: colors.muted, marginTop: 4 },
  logoutBtn: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  logoutText: { color: colors.text, fontWeight: "600" },
});
