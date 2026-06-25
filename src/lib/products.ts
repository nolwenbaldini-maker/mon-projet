import { supabase } from "./supabase";

/** États possibles (repris du site). */
export const CONDITIONS = ["Neuf", "Très bon", "Bon", "Correct"];

/** Plateformes / consoles (balises reprises du site). */
export const CONSOLE_TAGS: { value: string; label: string }[] = [
  { value: "Switch", label: "Nintendo Switch" },
  { value: "PS5", label: "Sony PS5" },
  { value: "PS4", label: "Sony PS4" },
  { value: "PS3", label: "Sony PS3" },
  { value: "Xbox Series", label: "Xbox Series S/X" },
  { value: "Xbox One", label: "Xbox One" },
  { value: "Xbox 360", label: "Xbox 360" },
  { value: "3DS", label: "Nintendo 3DS" },
  { value: "2DS", label: "Nintendo 2DS" },
  { value: "DS", label: "Nintendo DS" },
  { value: "vintages", label: "Consoles vintages" },
];

export type ProductCategory =
  | "jeu_video"
  | "console"
  | "dvd"
  | "manga"
  | "informatique"
  | "accessoire"
  | "carte";

/** Nom de la fonction Lovable Cloud pour chaque catégorie. */
export const CATEGORY_FUNCTION: Record<ProductCategory, string> = {
  jeu_video: "create-shopify-product",
  console: "create-shopify-console",
  dvd: "create-shopify-dvd",
  manga: "create-shopify-manga",
  informatique: "create-shopify-informatique",
  accessoire: "create-shopify-accessoire",
  carte: "create-shopify-card",
};

export const CATEGORY_LABEL: Record<ProductCategory, string> = {
  jeu_video: "🎮 Jeu vidéo",
  console: "🕹️ Console",
  dvd: "🎬 DVD / Blu-ray",
  manga: "📚 Manga",
  informatique: "💻 Informatique",
  accessoire: "🎧 Accessoire",
  carte: "🃏 Carte",
};

/** Valeurs de "catégorie" attendues par les fonctions, par type (reprises du site). */
export const CATEGORY_OPTIONS: Partial<Record<ProductCategory, string[]>> = {
  carte: ["Pokémon FR", "Pokémon JAP", "One Piece FR", "One Piece US"],
  dvd: [
    "DVD Action",
    "DVD Comédie",
    "DVD Fantastique",
    "DVD Science-fiction",
    "DVD Thriller",
    "DVD Marvel/DC",
    "DVD Manga",
    "Blu-ray",
  ],
  manga: ["Manga"],
  informatique: [
    "Claviers",
    "Souris",
    "Casques",
    "PC portables",
    "Téléphones",
    "Montres connectées",
    "Accessoires",
  ],
};

/** Extrait le vrai message d'erreur renvoyé par une Edge Function (corps de la réponse). */
async function readFunctionError(error: any): Promise<string> {
  try {
    const ctx = error?.context;
    if (ctx && typeof ctx.json === "function") {
      const body = await ctx.clone().json().catch(() => null);
      if (body) return body.error || body.message || JSON.stringify(body);
    }
    if (ctx && typeof ctx.text === "function") {
      const txt = await ctx.text().catch(() => "");
      if (txt) return txt;
    }
  } catch {
    /* ignore */
  }
  return error?.message || "Échec de la publication.";
}

/** Appelle une fonction Lovable Cloud de création de produit Shopify. */
export async function createShopifyProduct(
  category: ProductCategory,
  body: Record<string, any>
): Promise<any> {
  const fn = CATEGORY_FUNCTION[category];
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) {
    const detail = await readFunctionError(error);
    throw new Error(detail);
  }
  return data;
}
