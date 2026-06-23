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
import {
  getRachatMessages,
  getRachatRequestById,
  sendAdminRachatMessage,
  updateRachatRequest,
  type RachatMessage,
  type RachatRequest,
} from "../lib/db";
import type { AdminRachatProps } from "../navigation";
import { colors } from "../theme";
import { RACHAT_STATUSES } from "./RachatScreen";

export function AdminRachatScreen({ route }: AdminRachatProps) {
  const { id } = route.params;
  const [request, setRequest] = useState<RachatRequest | null>(null);
  const [messages, setMessages] = useState<RachatMessage[]>([]);
  const [status, setStatus] = useState<string>("en_attente");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  async function load() {
    const [r, msgs] = await Promise.all([
      getRachatRequestById(id).catch(() => null),
      getRachatMessages(id).catch(() => []),
    ]);
    if (r) {
      setRequest(r);
      setStatus(r.status || "en_attente");
      setNotes(r.admin_notes || "");
    }
    setMessages(msgs);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function saveStatus(newStatus: string) {
    setStatus(newStatus);
    setSavingStatus(true);
    try {
      await updateRachatRequest(id, newStatus, notes.trim() || null);
    } catch {
      Alert.alert("Erreur", "Impossible d'enregistrer le statut.");
    } finally {
      setSavingStatus(false);
    }
  }

  async function saveNotes() {
    try {
      await updateRachatRequest(id, status, notes.trim() || null);
      Alert.alert("✅ Enregistré", "Notes internes mises à jour.");
    } catch {
      Alert.alert("Erreur", "Impossible d'enregistrer les notes.");
    }
  }

  async function reply() {
    const content = text.trim();
    if (!content) return;
    setSending(true);
    try {
      await sendAdminRachatMessage(id, content);
      setText("");
      setMessages(await getRachatMessages(id));
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Description + photos */}
        <Text style={styles.label}>Demande du client</Text>
        <Text style={styles.desc}>{request?.description || "—"}</Text>
        {request?.photo_urls && request.photo_urls.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photos}>
            {request.photo_urls.map((url, i) => (
              <Image key={i} source={{ uri: url }} style={styles.photo} />
            ))}
          </ScrollView>
        )}

        {/* Statut */}
        <Text style={styles.label}>Statut {savingStatus ? "(enregistrement…)" : ""}</Text>
        <View style={styles.statuses}>
          {RACHAT_STATUSES.map((s) => (
            <TouchableOpacity
              key={s.value}
              style={[styles.statusChip, status === s.value && styles.statusActive]}
              onPress={() => saveStatus(s.value)}
            >
              <Text
                style={[styles.statusText, status === s.value && styles.statusTextActive]}
              >
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Notes internes */}
        <Text style={styles.label}>Notes internes (admin)</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Estimation, remarques… (non visible par le client)"
          placeholderTextColor={colors.muted}
          multiline
          value={notes}
          onChangeText={setNotes}
        />
        <TouchableOpacity style={styles.saveBtn} onPress={saveNotes}>
          <Text style={styles.saveText}>Enregistrer les notes</Text>
        </TouchableOpacity>

        {/* Conversation */}
        <Text style={styles.label}>Conversation</Text>
        {messages.length === 0 ? (
          <Text style={styles.empty}>Aucun message.</Text>
        ) : (
          messages.map((m) => {
            const mine = m.sender === "admin";
            return (
              <View key={m.id} style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                <Text style={[styles.bubbleText, mine && styles.mineText]}>{m.content}</Text>
                <Text style={[styles.time, mine && styles.mineText]}>
                  {m.sender === "admin" ? "Toi" : "Client"} ·{" "}
                  {new Date(m.created_at).toLocaleDateString("fr-FR")}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.replyInput}
          placeholder="Répondre au client…"
          placeholderTextColor={colors.muted}
          value={text}
          onChangeText={setText}
          multiline
        />
        <TouchableOpacity style={styles.sendBtn} onPress={reply} disabled={sending}>
          {sending ? (
            <ActivityIndicator color={colors.accentText} />
          ) : (
            <Text style={styles.sendText}>Envoyer</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  content: { padding: 16 },
  label: { fontSize: 14, fontWeight: "800", color: colors.text, marginTop: 18, marginBottom: 8 },
  desc: { fontSize: 15, color: colors.text, lineHeight: 21 },
  photos: { marginTop: 10 },
  photo: { width: 90, height: 90, borderRadius: 8, marginRight: 8, backgroundColor: colors.card },
  statuses: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
    marginBottom: 8,
  },
  statusActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  statusText: { color: colors.text, fontWeight: "600", fontSize: 13 },
  statusTextActive: { color: "#fff" },
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
  textarea: { height: 80, textAlignVertical: "top" },
  saveBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
  saveText: { color: colors.primary, fontWeight: "700" },
  empty: { color: colors.muted },
  bubble: { maxWidth: "85%", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 8 },
  mine: { alignSelf: "flex-end", backgroundColor: colors.primary },
  theirs: { alignSelf: "flex-start", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  bubbleText: { fontSize: 15, color: colors.text },
  mineText: { color: "#fff" },
  time: { fontSize: 11, color: colors.muted, marginTop: 4 },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  replyInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxHeight: 110,
    color: colors.text,
    backgroundColor: "#fff",
  },
  sendBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "center",
  },
  sendText: { color: colors.accentText, fontWeight: "700" },
});
