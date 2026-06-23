import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { isSupabaseConfigured } from "../config/supabase";
import {
  getLinkedOrders,
  getRachatRequests,
  isAdminUser,
  type LinkedOrder,
  type RachatRequest,
} from "../lib/db";
import { rachatStatusLabel } from "./RachatScreen";
import { colors } from "../theme";

export function AccountScreen() {
  const { user, initializing } = useAuth();

  if (!isSupabaseConfigured()) {
    return (
      <View style={styles.center}>
        <Text style={styles.infoTitle}>Connexion à configurer</Text>
        <Text style={styles.infoText}>
          Renseigne <Text style={styles.code}>EXPO_PUBLIC_SUPABASE_URL</Text> et{" "}
          <Text style={styles.code}>EXPO_PUBLIC_SUPABASE_ANON_KEY</Text> dans le
          fichier <Text style={styles.code}>.env</Text>.
        </Text>
      </View>
    );
  }

  if (initializing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return user ? <Profile /> : <AuthForm />;
}

/* ------------------------- Connexion / Inscription ------------------------- */

function AuthForm() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, busy } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function google() {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      setError(e.message ?? "La connexion Google a échoué.");
    }
  }

  async function submitEmail() {
    setError(null);
    if (!email || !password) {
      setError("Renseigne ton email et ton mot de passe.");
      return;
    }
    try {
      if (mode === "login") {
        await signInWithEmail(email, password);
      } else {
        const needsConfirm = await signUpWithEmail(email, password, fullName);
        if (needsConfirm) {
          Alert.alert(
            "Vérifie tes emails 📧",
            "Un email de confirmation t'a été envoyé. Clique sur le lien, puis connecte-toi."
          );
          setMode("login");
        }
      }
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
          Tes identifiants sont les mêmes que sur le site cash16.fr.
        </Text>

        {/* Connexion Google (gérée par Supabase, comme le site) */}
        <TouchableOpacity style={styles.googleBtn} onPress={google} disabled={busy}>
          <Text style={styles.googleG}>G</Text>
          <Text style={styles.googleText}>Continuer avec Google</Text>
        </TouchableOpacity>

        <View style={styles.sepRow}>
          <View style={styles.sepLine} />
          <Text style={styles.sepText}>ou</Text>
          <View style={styles.sepLine} />
        </View>

        {mode === "signup" && (
          <TextInput
            style={styles.input}
            placeholder="Nom complet"
            placeholderTextColor={colors.muted}
            value={fullName}
            onChangeText={setFullName}
          />
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

        <TouchableOpacity style={styles.primaryBtn} onPress={submitEmail} disabled={busy}>
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
  const { user, signOut } = useAuth();
  const navigation = useNavigation<any>();
  const [orders, setOrders] = useState<LinkedOrder[]>([]);
  const [rachats, setRachats] = useState<RachatRequest[]>([]);
  const [admin, setAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [o, r, a] = await Promise.all([
        getLinkedOrders(user.id).catch(() => []),
        getRachatRequests(user.id).catch(() => []),
        isAdminUser(user.id),
      ]);
      setOrders(o);
      setRachats(r);
      setAdmin(a);
      setLoading(false);
    })();
  }, [user?.id]);

  if (!user) return null;

  const meta = user.user_metadata || {};
  const name: string = meta.full_name || meta.name || "";
  const avatar: string | undefined = meta.avatar_url || meta.picture;

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.profile}>
      <View style={styles.profileHeader}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarLetter}>
              {(name || user.email || "?").charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={styles.hello}>Bonjour {name || "👋"}</Text>
        <Text style={styles.email}>{user.email}</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
      ) : (
        <>
          {/* Mes commandes */}
          <Text style={styles.sectionTitle}>Mes commandes</Text>
          {orders.length === 0 ? (
            <Text style={styles.empty}>Aucune commande rattachée à ton compte.</Text>
          ) : (
            orders.map((o) => (
              <View key={o.id} style={styles.rowCard}>
                <Text style={styles.rowTitle}>{o.order_name || "Commande"}</Text>
                {o.order_email ? (
                  <Text style={styles.rowSub}>{o.order_email}</Text>
                ) : null}
              </View>
            ))
          )}

          {/* Mes rachats */}
          <Text style={[styles.sectionTitle, { marginTop: 22 }]}>Mes rachats</Text>
          {rachats.length === 0 ? (
            <Text style={styles.empty}>Aucune demande de rachat pour le moment.</Text>
          ) : (
            rachats.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={styles.rowCard}
                onPress={() =>
                  navigation.navigate("Rachat", {
                    id: r.id,
                    title: "Rachat",
                  })
                }
              >
                <View style={styles.rowTop}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {r.description || "Demande de rachat"}
                  </Text>
                  <Text style={styles.badge}>{rachatStatusLabel(r.status)}</Text>
                </View>
                <Text style={styles.rowSub}>
                  {new Date(r.created_at).toLocaleDateString("fr-FR")} · voir la conversation ›
                </Text>
              </TouchableOpacity>
            ))
          )}
        </>
      )}

      {admin && (
        <TouchableOpacity
          style={styles.adminBtn}
          onPress={() => navigation.navigate("Admin")}
        >
          <Text style={styles.adminText}>🛠️ Espace admin</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: colors.background,
  },
  infoTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 10 },
  infoText: { textAlign: "center", color: colors.muted, lineHeight: 22 },
  code: { fontFamily: "monospace", color: colors.primary },

  form: { padding: 20 },
  formTitle: { fontSize: 22, fontWeight: "800", color: colors.text },
  formSubtitle: { fontSize: 14, color: colors.muted, marginTop: 6, marginBottom: 18 },

  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 13,
    backgroundColor: "#fff",
  },
  googleG: { fontSize: 18, fontWeight: "800", color: "#4285F4" },
  googleText: { fontSize: 15, fontWeight: "700", color: colors.text },

  sepRow: { flexDirection: "row", alignItems: "center", marginVertical: 18, gap: 10 },
  sepLine: { flex: 1, height: 1, backgroundColor: colors.border },
  sepText: { color: colors.muted, fontSize: 13 },

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
  profileHeader: { alignItems: "center", marginBottom: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
  avatarFallback: {
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { color: "#fff", fontSize: 32, fontWeight: "800" },
  hello: { fontSize: 20, fontWeight: "800", color: colors.text },
  email: { fontSize: 14, color: colors.muted, marginTop: 4 },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: colors.text, marginBottom: 8 },
  empty: { color: colors.muted, lineHeight: 20 },
  rowCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    backgroundColor: colors.card,
  },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  rowTitle: { flex: 1, fontSize: 15, fontWeight: "700", color: colors.text },
  rowSub: { fontSize: 13, color: colors.muted, marginTop: 4 },
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
  adminBtn: {
    marginTop: 24,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  adminText: { color: "#fff", fontWeight: "700" },
  logoutBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  logoutText: { color: colors.text, fontWeight: "600" },
});
