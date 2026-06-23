import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
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
import { createRachatRequest, moderateImage } from "../lib/rachat";
import { uploadImages } from "../lib/storage";
import type { RachatRequestProps } from "../navigation";
import { colors } from "../theme";

export function RachatRequestScreen({ route }: RachatRequestProps) {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [description, setDescription] = useState(route.params?.prefill ?? "");
  const [images, setImages] = useState<{ base64: string; mime: string }[]>([]);
  const [busy, setBusy] = useState(false);

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.gateTitle}>Connecte-toi d'abord</Text>
        <Text style={styles.gateText}>
          Tu dois être connecté pour envoyer une demande de rachat et suivre sa progression.
        </Text>
        <TouchableOpacity style={styles.gateBtn} onPress={() => navigation.navigate("Main", { screen: "Compte" })}>
          <Text style={styles.gateBtnText}>Aller à Mon compte</Text>
        </TouchableOpacity>
      </View>
    );
  }

  async function pickImages() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 6,
      quality: 0.6,
      base64: true,
    });
    if (!res.canceled) {
      const picked = res.assets
        .filter((a) => a.base64)
        .map((a) => ({ base64: a.base64 as string, mime: a.mimeType || "image/jpeg" }));
      setImages((prev) => [...prev, ...picked].slice(0, 6));
    }
  }

  async function submit() {
    if (!description.trim()) {
      Alert.alert("Description requise", "Décris l'article que tu veux vendre.");
      return;
    }
    setBusy(true);
    try {
      // Modération des photos (best-effort)
      for (const img of images) {
        const ok = await moderateImage(img.base64, img.mime);
        if (!ok) {
          Alert.alert("Photo refusée", "Une des photos a été refusée par la modération. Retire-la et réessaie.");
          setBusy(false);
          return;
        }
      }
      // Upload → URLs
      const photoUrls = images.length
        ? await uploadImages("rachat-photos", images.map((i) => i.base64), "rachat")
        : [];
      // Création de la demande
      await createRachatRequest(user!.id, description.trim(), photoUrls);
      Alert.alert(
        "✅ Demande envoyée !",
        "Notre équipe va l'étudier. Tu peux suivre la réponse dans « Mes rachats ».",
        [{ text: "OK", onPress: () => navigation.navigate("Main", { screen: "Compte" }) }]
      );
    } catch (e: any) {
      Alert.alert("Erreur", e.message ?? "L'envoi a échoué.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.h1}>Demande de rachat</Text>
        <Text style={styles.sub}>Décris ton article et ajoute des photos. On te répond vite !</Text>

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Ex : iPhone 12 128 Go bleu, parfait état, avec chargeur…"
          placeholderTextColor={colors.muted}
          multiline
          value={description}
          onChangeText={setDescription}
        />

        <Text style={styles.label}>Photos ({images.length}/6)</Text>
        <Text style={styles.hint}>Des photos nettes accélèrent l'estimation.</Text>
        <View style={styles.photos}>
          {images.map((img, i) => (
            <View key={i} style={styles.photoWrap}>
              <Image source={{ uri: `data:${img.mime};base64,${img.base64}` }} style={styles.photo} />
              <TouchableOpacity style={styles.photoRemove} onPress={() => setImages(images.filter((_, j) => j !== i))}>
                <Text style={styles.photoRemoveText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          {images.length < 6 && (
            <TouchableOpacity style={styles.addPhoto} onPress={pickImages}>
              <Text style={styles.addPhotoText}>+</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.submit} onPress={submit} disabled={busy}>
          {busy ? <ActivityIndicator color={colors.accentText} /> : <Text style={styles.submitText}>Envoyer ma demande</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: 18 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, backgroundColor: colors.background },
  gateTitle: { fontSize: 19, fontWeight: "800", color: colors.text, marginBottom: 10 },
  gateText: { color: colors.muted, textAlign: "center", lineHeight: 21, marginBottom: 18 },
  gateBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 22, paddingVertical: 13 },
  gateBtnText: { color: "#fff", fontWeight: "700" },
  h1: { fontSize: 23, fontWeight: "800", color: colors.text },
  sub: { fontSize: 14, color: colors.muted, marginTop: 6, marginBottom: 8 },
  label: { fontSize: 15, fontWeight: "800", color: colors.text, marginTop: 18, marginBottom: 8 },
  hint: { fontSize: 12, color: colors.muted, marginBottom: 10, marginTop: -4 },
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
  textarea: { height: 120, textAlignVertical: "top" },
  photos: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  photoWrap: { position: "relative" },
  photo: { width: 78, height: 78, borderRadius: 8, backgroundColor: colors.card },
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
    width: 78,
    height: 78,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  addPhotoText: { fontSize: 28, color: colors.muted },
  submit: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 26,
  },
  submitText: { color: colors.accentText, fontWeight: "800", fontSize: 16 },
});
