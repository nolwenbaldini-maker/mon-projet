import { useNavigation } from "@react-navigation/native";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "../theme";

/** Accueil de l'espace admin (réservé aux comptes admin). */
export function AdminScreen() {
  const navigation = useNavigation<any>();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Espace admin</Text>
      <Text style={styles.subtitle}>Gère ta boutique €ASH depuis l'app.</Text>

      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("AdminRachats")}
      >
        <Text style={styles.cardEmoji}>🔄</Text>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>Gérer les rachats</Text>
          <Text style={styles.cardSub}>
            Voir les demandes, changer le statut, répondre aux clients
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("AdminArgus")}
      >
        <Text style={styles.cardEmoji}>📈</Text>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>Gérer l'argus</Text>
          <Text style={styles.cardSub}>
            Consulter les cotes (smartphones, consoles) et les actualiser
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("AdminProduct")}
      >
        <Text style={styles.cardEmoji}>🏷️</Text>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>Publier un produit</Text>
          <Text style={styles.cardSub}>
            Mettre un article en ligne sur Shopify (avec son stock)
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 18 },
  title: { fontSize: 22, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 14, color: colors.muted, marginTop: 6, marginBottom: 20 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    backgroundColor: colors.card,
  },
  cardEmoji: { fontSize: 30 },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  cardSub: { fontSize: 13, color: colors.muted, marginTop: 3 },
  chevron: { fontSize: 26, color: colors.muted },
});
