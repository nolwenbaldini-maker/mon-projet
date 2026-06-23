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
import { uploadImages } from "../lib/storage";
import {
  CATEGORY_LABEL,
  CONDITIONS,
  CONSOLE_TAGS,
  createShopifyProduct,
  type ProductCategory,
} from "../lib/products";
import { colors } from "../theme";

const CATEGORIES = Object.keys(CATEGORY_LABEL) as ProductCategory[];

export function AdminProductScreen() {
  const [category, setCategory] = useState<ProductCategory>("console");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("1");
  const [condition, setCondition] = useState("Très bon");
  const [images, setImages] = useState<string[]>([]);

  // Champs spécifiques
  const [platform, setPlatform] = useState(CONSOLE_TAGS[0].value);
  const [platformGroup, setPlatformGroup] = useState("");
  const [consoleTag, setConsoleTag] = useState(CONSOLE_TAGS[0].value);
  const [cat, setCat] = useState(""); // category libre (dvd/manga/info/carte)
  const [cardNumber, setCardNumber] = useState("");
  const [setName, setSetName] = useState("");
  const [rarity, setRarity] = useState("");

  const [busy, setBusy] = useState(false);

  async function pickImages() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 6,
      quality: 0.6,
      base64: true,
    });
    if (!res.canceled) {
      const b64 = res.assets.map((a) => a.base64).filter((b): b is string => !!b);
      setImages((prev) => [...prev, ...b64].slice(0, 6));
    }
  }

  function reset() {
    setTitle("");
    setDescription("");
    setPrice("");
    setStock("1");
    setImages([]);
    setCat("");
    setCardNumber("");
    setSetName("");
    setRarity("");
  }

  async function publish() {
    if (!title.trim() || !price.trim()) {
      Alert.alert("Champs requis", "Le titre et le prix sont obligatoires.");
      return;
    }
    setBusy(true);
    try {
      // 1) Upload des photos → URLs publiques (bucket product-photos)
      const imageUrls = images.length ? await uploadImages("product-photos", images, "prod") : [];

      // 2) Corps adapté à la catégorie
      const base = {
        title: title.trim(),
        condition,
        price: Number(price.replace(",", ".")),
        stock: Number(stock) || 0,
        description: description.trim(),
        imageUrls,
      };
      let body: Record<string, any> = base;
      if (category === "jeu_video") {
        body = { ...base, platform, platformGroup: platformGroup.trim() || undefined };
      } else if (category === "console") {
        body = { ...base, consoleTag };
      } else if (category === "dvd" || category === "manga" || category === "informatique") {
        body = { ...base, category: cat.trim() };
      } else if (category === "carte") {
        body = {
          ...base,
          category: cat.trim(),
          cardNumber: cardNumber.trim() || undefined,
          setName: setName.trim() || undefined,
          rarity: rarity.trim() || undefined,
        };
      }

      // 3) Appel de la fonction Lovable Cloud (jeton Admin côté serveur)
      await createShopifyProduct(category, body);
      Alert.alert("✅ Produit publié !", "Il est en ligne sur la boutique, avec son stock.", [
        { text: "Super", onPress: reset },
      ]);
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

        {/* Catégorie */}
        <Text style={styles.label}>Catégorie</Text>
        <View style={styles.wrapRow}>
          {CATEGORIES.map((c) => (
            <Chip key={c} label={CATEGORY_LABEL[c]} active={category === c} onPress={() => setCategory(c)} />
          ))}
        </View>

        <Text style={styles.label}>Titre *</Text>
        <TextInput style={styles.input} placeholder="Ex : Console PS5 Slim 1To" placeholderTextColor={colors.muted} value={title} onChangeText={setTitle} />

        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, styles.textarea]} placeholder="État, accessoires inclus…" placeholderTextColor={colors.muted} multiline value={description} onChangeText={setDescription} />

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>Prix (€) *</Text>
            <TextInput style={styles.input} placeholder="99.99" placeholderTextColor={colors.muted} keyboardType="decimal-pad" value={price} onChangeText={setPrice} />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>Stock</Text>
            <TextInput style={styles.input} placeholder="1" placeholderTextColor={colors.muted} keyboardType="number-pad" value={stock} onChangeText={setStock} />
          </View>
        </View>

        <Text style={styles.label}>État</Text>
        <View style={styles.wrapRow}>
          {CONDITIONS.map((c) => (
            <Chip key={c} label={c} active={condition === c} onPress={() => setCondition(c)} />
          ))}
        </View>

        {/* Champs spécifiques selon la catégorie */}
        {category === "jeu_video" && (
          <>
            <Text style={styles.label}>Plateforme</Text>
            <View style={styles.wrapRow}>
              {CONSOLE_TAGS.map((t) => (
                <Chip key={t.value} label={t.label} active={platform === t.value} onPress={() => setPlatform(t.value)} />
              ))}
            </View>
            <Text style={styles.label}>Groupe (optionnel)</Text>
            <TextInput style={styles.input} placeholder="Ex : Sony, Nintendo, Microsoft…" placeholderTextColor={colors.muted} value={platformGroup} onChangeText={setPlatformGroup} />
          </>
        )}

        {category === "console" && (
          <>
            <Text style={styles.label}>Console</Text>
            <View style={styles.wrapRow}>
              {CONSOLE_TAGS.map((t) => (
                <Chip key={t.value} label={t.label} active={consoleTag === t.value} onPress={() => setConsoleTag(t.value)} />
              ))}
            </View>
          </>
        )}

        {(category === "dvd" || category === "manga" || category === "informatique") && (
          <>
            <Text style={styles.label}>Catégorie / rayon</Text>
            <TextInput
              style={styles.input}
              placeholder={
                category === "dvd"
                  ? "Ex : action, comedie, science-fiction, thriller, blu-ray…"
                  : category === "informatique"
                  ? "Ex : clavier, souris, casque, pc-portable, telephone, montre"
                  : "Ex : manga, dvd-manga"
              }
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              value={cat}
              onChangeText={setCat}
            />
          </>
        )}

        {category === "carte" && (
          <>
            <Text style={styles.label}>Catégorie</Text>
            <TextInput style={styles.input} placeholder="Ex : pokemon-fr, pokemon-jp, one-piece…" placeholderTextColor={colors.muted} autoCapitalize="none" value={cat} onChangeText={setCat} />
            <View style={styles.row}>
              <View style={styles.half}>
                <Text style={styles.label}>N° carte (opt.)</Text>
                <TextInput style={styles.input} placeholder="025/198" placeholderTextColor={colors.muted} value={cardNumber} onChangeText={setCardNumber} />
              </View>
              <View style={styles.half}>
                <Text style={styles.label}>Rareté (opt.)</Text>
                <TextInput style={styles.input} placeholder="Rare, Holo…" placeholderTextColor={colors.muted} value={rarity} onChangeText={setRarity} />
              </View>
            </View>
            <Text style={styles.label}>Set / extension (opt.)</Text>
            <TextInput style={styles.input} placeholder="Ex : Écarlate & Violet" placeholderTextColor={colors.muted} value={setName} onChangeText={setSetName} />
          </>
        )}

        {/* Photos */}
        <Text style={styles.label}>Photos ({images.length}/6)</Text>
        <View style={styles.photos}>
          {images.map((b64, i) => (
            <View key={i} style={styles.photoWrap}>
              <Image source={{ uri: `data:image/jpeg;base64,${b64}` }} style={styles.photo} />
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

        <TouchableOpacity style={styles.primaryBtn} onPress={publish} disabled={busy}>
          {busy ? <ActivityIndicator color={colors.accentText} /> : <Text style={styles.primaryBtnText}>Publier sur la boutique</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  form: { padding: 18 },
  formTitle: { fontSize: 22, fontWeight: "800", color: colors.text, marginBottom: 6 },
  label: { fontSize: 14, fontWeight: "700", color: colors.text, marginTop: 16, marginBottom: 8 },
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
  textarea: { height: 84, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontWeight: "600", fontSize: 13 },
  chipTextActive: { color: "#fff" },
  photos: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  photoWrap: { position: "relative" },
  photo: { width: 74, height: 74, borderRadius: 8, backgroundColor: colors.card },
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
    width: 74,
    height: 74,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  addPhotoText: { fontSize: 28, color: colors.muted },
  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 26,
  },
  primaryBtnText: { color: colors.accentText, fontWeight: "700", fontSize: 16 },
});
