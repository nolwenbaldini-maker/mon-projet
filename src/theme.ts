/** Palette et helpers de style, alignés sur les couleurs de cash16.fr. */

export const colors = {
  // Vert d'identité €ASH (repris du site : hsl 138 40% 22%)
  primary: "#224f2f",
  primaryDark: "#133a1e", // vert très foncé (hsl 138 51% 15%) — titres/textes
  // Doré des boutons d'action du site (hsl 45 100% 50%)
  accent: "#ffbf00",
  accentText: "#133a1e", // texte foncé sur fond doré (bon contraste)
  dark: "#133a1e",
  text: "#133a1e",
  muted: "#6b7280",
  background: "#ffffff",
  card: "#eef4f0", // vert très clair (fonds de cartes)
  border: "#d9e6dd",
  success: "#16a34a",
};

/** Formate un montant Shopify (ex: "12.50" + "EUR") en "12,50 €". */
export function formatMoney(amount: string, currencyCode: string): string {
  const value = Number(amount);
  try {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: currencyCode,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currencyCode}`;
  }
}

/**
 * Pourcentage de réduction d'une promo (prix barré vs prix actuel).
 * Renvoie 0 s'il n'y a pas de promo réelle (prix barré absent ou ≤ prix).
 */
export function discountPercent(price?: string | number | null, compareAt?: string | number | null): number {
  const p = Number(price);
  const c = Number(compareAt);
  if (!isFinite(p) || !isFinite(c) || c <= p || p <= 0) return 0;
  return Math.round(((c - p) / c) * 100);
}
