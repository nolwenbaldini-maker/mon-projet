import { shopifyRequest } from "../shopify/client";
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
  condition: string | null; // état/grade (Neuf, Très bon, Bon, Correct…) si trouvé
  tags: string[]; // toutes les balises (pour différencier les produits identiques)
  productType: string | null;
}

/** Détaille l'état/grade d'un produit à partir de ses balises. */
function pickCondition(tags: string[]): string | null {
  const lc = CONDITIONS.map((c) => c.toLowerCase());
  for (const t of tags) {
    const i = lc.indexOf(t.trim().toLowerCase());
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
            featuredImage { url(transform: { maxWidth: 200, maxHeight: 200 }) }
            priceRange { minVariantPrice { amount currencyCode } }
          }
        }
      }
    }
  `;
  const data = await shopifyRequest<any>(gql, { q: query || undefined });
  return data.products.edges.map((e: any) => {
    const tags: string[] = e.node.tags ?? [];
    const amount = e.node.priceRange?.minVariantPrice?.amount;
    return {
      gid: e.node.id,
      id: Number(String(e.node.id).match(/(\d+)$/)?.[1] ?? 0),
      title: e.node.title,
      image: e.node.featuredImage?.url ?? null,
      availableForSale: e.node.availableForSale,
      price: amount != null ? String(amount) : null,
      condition: pickCondition(tags),
      tags,
      productType: e.node.productType || null,
    };
  });
}

async function fnError(error: any): Promise<string> {
  try {
    const ctx = error?.context;
    if (ctx?.json) {
      const b = await ctx.clone().json().catch(() => null);
      if (b) return b.error || b.message || JSON.stringify(b);
    }
  } catch {}
  return error?.message || "Erreur stock.";
}

export interface StockInfo {
  available: number | null;
  price: number | null;
}

/** Lit le stock et le prix actuels d'un produit (variante principale). */
export async function getStockInfo(productId: number): Promise<StockInfo> {
  const { data, error } = await supabase.functions.invoke("manage-stock", {
    body: { action: "get", productId },
  });
  if (error) throw new Error(await fnError(error));
  return {
    available: typeof data?.available === "number" ? data.available : null,
    price: data?.price != null ? Number(data.price) : null,
  };
}

/**
 * Définit le stock et/ou le prix d'un produit.
 * available = 0 → rupture → disparaît du site.
 * price : nombre en euros (optionnel).
 */
export async function saveStockPrice(
  productId: number,
  available: number,
  price?: number | null
): Promise<StockInfo> {
  const body: Record<string, any> = {
    action: "set",
    productId,
    available: Math.max(0, Math.floor(available)),
  };
  if (price != null && !Number.isNaN(price)) body.price = price;
  const { data, error } = await supabase.functions.invoke("manage-stock", { body });
  if (error) throw new Error(await fnError(error));
  return {
    available: typeof data?.available === "number" ? data.available : available,
    price: data?.price != null ? Number(data.price) : price ?? null,
  };
}
