import { shopifyRequest } from "../shopify/client";
import { discountPercent } from "../theme";
import { CONDITIONS } from "./products";
import { supabase } from "./supabase";

/** Gestion des stocks + prix (admin) — lecture via Storefront, écriture via la fonction Lovable manage-stock. */

export interface AdminProduct {
  id: number; // identifiant numérique Shopify
  gid: string;
  title: string;
  image: string | null;
  availableForSale: boolean;
  price: string | null; // prix affiché (depuis la Storefront)
  compareAtPrice: string | null; // prix barré (avant promo) si promo en cours
  promoPercent: number; // % de réduction (0 si pas de promo)
  condition: string | null; // état/grade (Neuf, Très bon, Bon, Correct…) si trouvé
  tags: string[]; // toutes les balises (pour différencier les produits identiques)
  productType: string | null;
}

/**
 * Détaille l'état/grade d'un produit.
 * Sur cette boutique, le grade est stocké comme une OPTION de variante nommée
 * « État » (ex. options: [{name:"État", values:["Très bon"]}]). On le récupère
 * là en priorité ; à défaut on regarde les balises.
 */
function pickCondition(options: { name: string; values: string[] }[], tags: string[]): string | null {
  const etat = (options ?? []).find((o) => {
    const n = (o.name || "").toLowerCase();
    return n === "état" || n === "etat" || n.includes("état") || n.includes("etat");
  });
  if (etat?.values?.length) {
    // Plusieurs grades sous un même produit : on les joint.
    return etat.values.join(", ");
  }
  // Repli : un tag qui correspond à un état connu.
  const lc = CONDITIONS.map((c) => c.toLowerCase());
  for (const t of tags ?? []) {
    const i = lc.indexOf(String(t).trim().toLowerCase());
    if (i >= 0) return CONDITIONS[i];
  }
  return null;
}

/** Recherche de produits (tous, y compris en rupture) pour l'admin. */
export async function searchAdminProducts(query: string): Promise<AdminProduct[]> {
  const gql = /* GraphQL */ `
    query AdminProducts($q: String) {
      products(first: 40, query: $q, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id
            title
            availableForSale
            productType
            tags
            options { name values }
            featuredImage { url(transform: { maxWidth: 200, maxHeight: 200 }) }
            priceRange { minVariantPrice { amount currencyCode } }
            compareAtPriceRange { minVariantPrice { amount currencyCode } }
          }
        }
      }
    }
  `;
  const data = await shopifyRequest<any>(gql, { q: query || undefined });
  return data.products.edges.map((e: any) => {
    const tags: string[] = e.node.tags ?? [];
    const options = e.node.options ?? [];
    const amount = e.node.priceRange?.minVariantPrice?.amount;
    const compareAmount = e.node.compareAtPriceRange?.minVariantPrice?.amount;
    const pct = discountPercent(amount, compareAmount);
    return {
      gid: e.node.id,
      id: Number(String(e.node.id).match(/(\d+)$/)?.[1] ?? 0),
      title: e.node.title,
      image: e.node.featuredImage?.url ?? null,
      availableForSale: e.node.availableForSale,
      price: amount != null ? String(amount) : null,
      compareAtPrice: pct > 0 ? String(compareAmount) : null,
      promoPercent: pct,
      condition: pickCondition(options, tags),
      tags,
      productType: e.node.productType || null,
    };
  });
}

async function fnError(error: any): Promise<string> {
  const ctx = error?.context;
  const status = ctx?.status;
  // Corps de la réponse de la fonction (message réel renvoyé par Lovable).
  try {
    if (ctx && typeof ctx.clone === "function") {
      const cloned = ctx.clone();
      const b = await cloned.json().catch(() => null);
      if (b) {
        const msg = b.error || b.message || JSON.stringify(b);
        return status ? `[${status}] ${msg}` : msg;
      }
      const txt = await ctx.text?.().catch(() => "");
      if (txt) return status ? `[${status}] ${txt}` : txt;
    }
  } catch {}
  if (status === 404) {
    return "404 — fonction « manage-stock » introuvable (pas déployée côté Lovable ?).";
  }
  if (status) return `[${status}] ${error?.message || "erreur"}`;
  // Pas de réponse HTTP du tout : réseau / fonction injoignable.
  return error?.message
    ? `${error.message} (fonction injoignable ?)`
    : "Fonction injoignable (réseau ou déploiement).";
}

export interface StockInfo {
  available: number | null;
  price: number | null;
  compareAtPrice: number | null; // prix barré (promo en cours) si présent
  promoPercent: number; // % de réduction actuel (0 si pas de promo)
}

/** Options de mise à jour stock/prix/promo. */
export interface SaveOptions {
  price?: number | null;
  /** Applique une promo de ce % (prix barré = base, prix = base × (1 − %)). */
  promoPercent?: number | null;
  /** Retire la promo (restaure le prix barré comme prix, supprime la balise). */
  removePromo?: boolean;
}

/** Diagnostic de configuration (domaine + présence du jeton, jamais sa valeur). */
export async function diagStock(): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke("manage-stock", {
      body: { action: "diag" },
    });
    if (error) return await fnError(error);
    if (!data) return "réponse vide";
    const vars = Object.keys(data.tokenVarsPresent ?? {});
    const tests = data.shopTests
      ? Object.entries(data.shopTests)
          .map(([v, r]) => `   ${v}: ${r}`)
          .join("\n")
      : "(non testé)";
    return [
      `domaine: ${data.domain}`,
      `jeton Admin détecté: ${data.tokenLooksAdmin ? "oui (shpat_…)" : "NON"}`,
      `longueur jeton: ${data.tokenLength}`,
      `jetons shpat_ trouvés: ${data.shpatCount ?? "?"}`,
      `variables: ${vars.length ? vars.join(", ") : "aucune"}`,
      `test du jeton sur Shopify:`,
      tests,
    ].join("\n");
  } catch (e: any) {
    return e?.message ?? "diagnostic indisponible";
  }
}

/** Lit le stock et le prix actuels d'un produit (variante principale). */
export async function getStockInfo(productId: number): Promise<StockInfo> {
  const { data, error } = await supabase.functions.invoke("manage-stock", {
    body: { action: "get", productId },
  });
  if (error) throw new Error(await fnError(error));
  const price = data?.price != null ? Number(data.price) : null;
  const compareAt = data?.compareAtPrice != null ? Number(data.compareAtPrice) : null;
  return {
    available: typeof data?.available === "number" ? data.available : null,
    price,
    compareAtPrice: compareAt,
    promoPercent: discountPercent(price, compareAt),
  };
}

/**
 * Définit le stock et/ou le prix d'un produit, et gère la promo.
 * available = 0 → rupture → disparaît du site.
 */
export async function saveStockPrice(
  productId: number,
  available: number,
  opts: SaveOptions = {}
): Promise<StockInfo> {
  const body: Record<string, any> = {
    action: "set",
    productId,
    available: Math.max(0, Math.floor(available)),
  };
  if (opts.price != null && !Number.isNaN(opts.price)) body.price = opts.price;
  if (opts.promoPercent != null && opts.promoPercent > 0) body.promoPercent = opts.promoPercent;
  if (opts.removePromo) body.removePromo = true;
  const { data, error } = await supabase.functions.invoke("manage-stock", { body });
  if (error) throw new Error(await fnError(error));
  const price = data?.price != null ? Number(data.price) : opts.price ?? null;
  const compareAt = data?.compareAtPrice != null ? Number(data.compareAtPrice) : null;
  return {
    available: typeof data?.available === "number" ? data.available : available,
    price,
    compareAtPrice: compareAt,
    promoPercent: discountPercent(price, compareAt),
  };
}
