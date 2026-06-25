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

/** Groupes + plateformes pour les JEUX VIDÉO (repris du site). */
export const PLATFORM_GROUPS: { label: string; platforms: string[] }[] = [
  {
    label: "Nintendo",
    platforms: ["Switch", "3DS", "DS", "Wii U", "Wii", "GameCube", "N64", "SNES", "NES", "Game Boy", "Game Boy Advance"],
  },
  { label: "PlayStation", platforms: ["PS5", "PS4", "PS3", "PS2", "PS1", "PSP", "PS Vita"] },
  { label: "Xbox", platforms: ["Xbox Series X/S", "Xbox One", "Xbox 360", "Xbox Classic"] },
  {
    label: "Rétro/Autre",
    platforms: ["SEGA Megadrive", "SEGA Saturn", "SEGA Dreamcast", "SEGA Master System", "Atari", "PC", "Autre"],
  },
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

/** Extrait l'identifiant numérique du produit depuis la réponse de création. */
function extractProductId(data: any): number | null {
  if (typeof data?.productId === "number") return data.productId;
  const src = data?.admin_url || data?.adminUrl || data?.storefront_url || data?.productId || "";
  const m = String(src).match(/(\d{6,})/);
  return m ? Number(m[1]) : null;
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

  // Les cartes nécessitent une 2e étape pour être réellement publiées sur la boutique.
  if (category === "carte") {
    const productId = extractProductId(data);
    if (!productId) {
      throw new Error(
        "Produit créé mais identifiant introuvable pour la publication. Vérifie dans Shopify."
      );
    }
    // Shopify peut ne pas être prêt juste après la création : on attend et on réessaie.
    let lastErr = "Shopify publish error";
    for (let attempt = 0; attempt < 4; attempt++) {
      await new Promise((r) => setTimeout(r, 2500));
      const { error: pubErr } = await supabase.functions.invoke("create-shopify-card", {
        body: { action: "publish_existing", productId },
      });
      if (!pubErr) return data; // publié avec succès
      lastErr = await readFunctionError(pubErr);
    }
    throw new Error("Produit créé mais publication échouée : " + lastErr);
  }

  return data;
}
