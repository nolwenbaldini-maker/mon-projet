import React, { useEffect, useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { RachatProps } from "../navigation";
import { getRachatMessages, sendRachatMessage, type RachatMessage } from "../lib/db";
import { colors } from "../theme";

/** Statuts de rachat utilisés par cash16.fr (valeur en base → libellé FR). */
export const RACHAT_STATUSES: { value: string; label: string }[] = [
  { value: "en_attente", label: "En attente" },
  { value: "estime", label: "Estimé" },
  { value: "accepte", label: "Accepté" },
  { value: "refuse", label: "Refusé" },
  { value: "termine", label: "Terminé" },
];

/** Traduit le statut d'un rachat en français. */
export function rachatStatusLabel(status: string | null): string {
  const found = RACHAT_STATUSES.find((s) => s.value === (status || "").toLowerCase());
  return found ? found.label : status || "—";
}

export function RachatScreen({ route }: RachatProps) {
  const { id } = route.params;
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<RachatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  async function load() {
    try {
      setMessages(await getRachatMessages(id));
    } catch {
      // RLS / réseau : on laisse la liste vide
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function send() {
    const content = text.trim();
    if (!content) return;
    setSending(true);
    try {
      await sendRachatMessage(id, content);
      setText("");
      await load();
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
      <ScrollView contentContainerStyle={styles.thread}>
        {messages.length === 0 ? (
          <Text style={styles.empty}>
            Aucun message pour l'instant. Écris à la boutique ci-dessous.
          </Text>
        ) : (
          messages.map((m) => {
            const mine = m.sender === "client";
            return (
              <View
                key={m.id}
                style={[styles.bubble, mine ? styles.mine : styles.theirs]}
              >
                <Text style={[styles.bubbleText, mine && styles.mineText]}>
                  {m.content}
                </Text>
                <Text style={[styles.time, mine && styles.mineText]}>
                  {new Date(m.created_at).toLocaleDateString("fr-FR")}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>

      <View style={[styles.inputRow, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          style={styles.input}
          placeholder="Ton message…"
          placeholderTextColor={colors.muted}
          value={text}
          onChangeText={setText}
          multiline
        />
        <TouchableOpacity style={styles.sendBtn} onPress={send} disabled={sending}>
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
  thread: { padding: 14, gap: 10 },
  empty: { color: colors.muted, textAlign: "center", marginTop: 30 },
  bubble: { maxWidth: "82%", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 },
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
  input: {
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
