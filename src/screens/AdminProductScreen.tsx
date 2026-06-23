import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";
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
import { adminCheck, adminCreateProduct } from "../admin/api";
import { isAdminConfigured } from "../config/admin";
import { getCollections } from "../shopify/queries";
import type { Collection } from "../shopify/types";
import { colors } from "../theme";

const SECRET_KEY = "cash16_admin_secret";

/** Extrait l'identifiant numérique d'un gid Shopify (…/Collection/123 → "123"). */
function numericId(gid: string): string {
  const m = gid.match(/(\d+)$/);
  return m ? m[1] : gid;
}

export function AdminProductScreen() {
  const [secret, setSecret] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const saved = await SecureStore.getItemAsync(SECRET_KEY);
      setSecret(saved);
      setChecking(false);
    })();
  }, []);

  if (!isAdminConfigured()) {
    return (
      <View style={styles.center}>
        <Text style={styles.infoTitle}>Espace admin non configuré</Text>
        <Text style={styles.infoText}>
          Renseigne l'adresse de ton serveur admin dans le fichier{" "}
          <Text style={styles.code}>.env</Text> :{"\n"}
          <Text style={styles.code}>EXPO_PUBLIC_ADMIN_API_URL</Text>
          {"\n\n"}(voir server/README.md)
        </Text>
      </View>
    );
  }

  if (checking) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return secret ? (
    <ProductForm secret={secret} onLogout={() => setSecret(null)} />
  ) : (
    <AdminLogin onAuth={setSecret} />
  );
}

/* ----------------------------- Connexion admin ----------------------------- */

function AdminLogin({ onAuth }: { onAuth: (secret: string) => void }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      await adminCheck(value);
      await SecureStore.setItemAsync(SECRET_KEY, value);
      onAuth(value);
    } catch (e: any) {
      setError(e.message ?? "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.loginWrap}>
      <Text style={styles.infoTitle}>🔒 Espace admin</Text>
      <Text style={styles.infoText}>
        Saisis ton mot de passe admin pour publier des produits.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Mot de passe admin"
        placeholderTextColor={colors.muted}
        secureTextEntry
        value={value}
        onChangeText={setValue}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <TouchableOpacity style={styles.primaryBtn} onPress={submit} disabled={busy}>
        {busy ? (
          <ActivityIndicator color={colors.accentText} />
        ) : (
          <Text style={styles.primaryBtnText}>Entrer</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

/* ------------------------------ Formulaire produit ------------------------- */

function ProductForm({ secret, onLogout }: { secret: string; onLogout: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [images, setImages] = useState<string[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getCollections()
      .then(setCollections)
      .catch(() => {});
  }, []);

  async function pickImages() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 0.6,
      base64: true,
    });
    if (!res.canceled) {
      const b64 = res.assets.map((a) => a.base64).filter((b): b is string => !!b);
      setImages((prev) => [...prev, ...b64].slice(0, 5));
    }
  }

  function reset() {
    setTitle("");
    setDescription("");
    setPrice("");
    setQuantity("1");
    setImages([]);
    setCollectionId(null);
  }

  async function publish() {
    if (!title.trim() || !price.trim()) {
      Alert.alert("Champs requis", "Le titre et le prix sont obligatoires.");
      return;
    }
    setBusy(true);
    try {
      const result = await adminCreateProduct(secret, {
        title: title.trim(),
        description: description.trim(),
        price: price.replace(",", ".").trim(),
        quantity: Number(quantity) || 0,
        collectionId: collectionId ? numericId(collectionId) : undefined,
        images,
      });
      Alert.alert(
        "✅ Produit publié !",
        "Il est en ligne sur ta boutique." +
          (result.warning ? `\n\n⚠️ ${result.warning}` : ""),
        [{ text: "Super", onPress: reset }]
      );
    } catch (e: any) {
      Alert.alert("Erreur", e.message ?? "La publication a échoué.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.formTitle}>Publier un produit</Text>

        <Text style={styles.label}>Titre *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex : Console PS4 Slim 500Go"
          placeholderTextColor={colors.muted}
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="État, accessoires inclus, garantie…"
          placeholderTextColor={colors.muted}
          multiline
          value={description}
          onChangeText={setDescription}
        />

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>Prix (€) *</Text>
            <TextInput
              style={styles.input}
              placeholder="99.99"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
              value={price}
              onChangeText={setPrice}
            />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>Stock</Text>
            <TextInput
              style={styles.input}
              placeholder="1"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              value={quantity}
              onChangeText={setQuantity}
            />
          </View>
        </View>

        <Text style={styles.label}>Photos ({images.length}/5)</Text>
        <View style={styles.photos}>
          {images.map((b64, i) => (
            <View key={i} style={styles.photoWrap}>
              <Image
                source={{ uri: `data:image/jpeg;base64,${b64}` }}
                style={styles.photo}
              />
              <TouchableOpacity
                style={styles.photoRemove}
                onPress={() => setImages(images.filter((_, j) => j !== i))}
              >
                <Text style={styles.photoRemoveText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          {images.length < 5 && (
            <TouchableOpacity style={styles.addPhoto} onPress={pickImages}>
              <Text style={styles.addPhotoText}>+</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.label}>Rubrique (optionnel)</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {collections.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.chip, collectionId === c.id && styles.chipActive]}
              onPress={() => setCollectionId(collectionId === c.id ? null : c.id)}
            >
              <Text
                style={[styles.chipText, collectionId === c.id && styles.chipTextActive]}
              >
                {c.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.primaryBtn} onPress={publish} disabled={busy}>
          {busy ? (
            <ActivityIndicator color={colors.accentText} />
          ) : (
            <Text style={styles.primaryBtnText}>Publier sur la boutique</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logout}
          onPress={async () => {
            await SecureStore.deleteItemAsync(SECRET_KEY);
            onLogout();
          }}
        >
          <Text style={styles.logoutText}>Quitter l'espace admin</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
  loginWrap: { flex: 1, padding: 24, justifyContent: "center", backgroundColor: colors.background },
  infoTitle: { fontSize: 20, fontWeight: "800", color: colors.text, marginBottom: 8 },
  infoText: { fontSize: 14, color: colors.muted, lineHeight: 22, marginBottom: 16 },
  code: { fontFamily: "monospace", color: colors.primary },

  form: { padding: 18 },
  formTitle: { fontSize: 22, fontWeight: "800", color: colors.text, marginBottom: 12 },
  label: { fontSize: 14, fontWeight: "700", color: colors.text, marginTop: 14, marginBottom: 6 },
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
  textarea: { height: 90, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },

  photos: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  photoWrap: { position: "relative" },
  photo: { width: 72, height: 72, borderRadius: 8, backgroundColor: colors.card },
  photoRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: colors.primary,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  photoRemoveText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  addPhoto: {
    width: 72,
    height: 72,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  addPhotoText: { fontSize: 28, color: colors.muted },

  chips: { paddingVertical: 4, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    marginRight: 8,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { color: colors.text, fontWeight: "600", fontSize: 13 },
  chipTextActive: { color: "#fff" },

  error: { color: "#dc2626", marginBottom: 12 },
  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 22,
  },
  primaryBtnText: { color: colors.accentText, fontWeight: "700", fontSize: 16 },
  logout: { alignItems: "center", marginTop: 16 },
  logoutText: { color: colors.muted, fontWeight: "600" },
});
