import { shopifyRequest } from "../shopify/client";
import { supabase } from "./supabase";

/** Gestion des stocks (admin) — lecture via Storefront, écriture via la fonction Lovable manage-stock. */

export interface AdminProduct {
  id: number; // identifiant numérique Shopify
  gid: string;
  title: string;
  image: string | null;
  availableForSale: boolean;
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
            featuredImage { url(transform: { maxWidth: 200, maxHeight: 200 }) }
          }
        }
      }
    }
  `;
  const data = await shopifyRequest<any>(gql, { q: query || undefined });
  return data.products.edges.map((e: any) => ({
    gid: e.node.id,
    id: Number(String(e.node.id).match(/(\d+)$/)?.[1] ?? 0),
    title: e.node.title,
    image: e.node.featuredImage?.url ?? null,
    availableForSale: e.node.availableForSale,
  }));
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

/** Lit le stock actuel d'un produit (variante principale). */
export async function getStock(productId: number): Promise<number | null> {
  const { data, error } = await supabase.functions.invoke("manage-stock", {
    body: { action: "get", productId },
  });
  if (error) throw new Error(await fnError(error));
  return typeof data?.available === "number" ? data.available : null;
}

/** Définit le stock d'un produit (0 = rupture → disparaît du site). */
export async function setStock(productId: number, available: number): Promise<number> {
  const { data, error } = await supabase.functions.invoke("manage-stock", {
    body: { action: "set", productId, available: Math.max(0, Math.floor(available)) },
  });
  if (error) throw new Error(await fnError(error));
  return typeof data?.available === "number" ? data.available : available;
}
