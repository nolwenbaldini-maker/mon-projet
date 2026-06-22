/** Palette et helpers de style partagés dans l'app €ASH. */

export const colors = {
  primary: "#e30613", // rouge €ASH
  dark: "#1a1a1a",
  text: "#1a1a1a",
  muted: "#6b7280",
  background: "#ffffff",
  card: "#f5f5f7",
  border: "#e5e7eb",
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
