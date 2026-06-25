// Fonction Edge Lovable Cloud (Supabase) : "manage-stock"
// À AJOUTER côté Lovable Cloud (pas dans l'app). Permet de lire et modifier
// le stock d'un produit Shopify depuis l'app €ASH.
//
// Secrets requis (réutilise ceux de tes autres fonctions create-shopify-*) :
//   SHOPIFY_STORE_DOMAIN   ex: happycash16.myshopify.com
//   SHOPIFY_ADMIN_TOKEN    (ou SHOPIFY_ADMIN_ACCESS_TOKEN) — jeton Admin avec
//                          les scopes write_inventory + read/write_products
//
// Contrat (corps JSON) :
//   { action: "get", productId: number }
//        -> { available: number, price: string }
//   { action: "set", productId: number, available: number, price?: number }
//        -> { available: number, price: string }
//   (available = 0  => rupture => le produit disparaît du site)
//   (price présent => met aussi à jour le prix de la variante principale)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const DOMAIN =
  Deno.env.get("SHOPIFY_STORE_DOMAIN") ??
  Deno.env.get("SHOPIFY_SHOP_DOMAIN") ??
  Deno.env.get("SHOPIFY_DOMAIN") ??
  "";
// IMPORTANT : doit pointer vers le MÊME secret que tes fonctions create-shopify-*.
// On tente tous les noms courants pour retrouver le jeton Admin déjà configuré.
const TOKEN =
  Deno.env.get("SHOPIFY_ADMIN_TOKEN") ??
  Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN") ??
  Deno.env.get("SHOPIFY_ADMIN_API_ACCESS_TOKEN") ??
  Deno.env.get("SHOPIFY_ADMIN_API_TOKEN") ??
  Deno.env.get("SHOPIFY_ACCESS_TOKEN") ??
  Deno.env.get("SHOPIFY_API_TOKEN") ??
  Deno.env.get("SHOPIFY_API_ACCESS_TOKEN") ??
  Deno.env.get("SHOPIFY_STOREFRONT_ADMIN_TOKEN") ??
  "";
const API = `https://${DOMAIN}/admin/api/2025-04`;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function shopify(path: string, method = "GET", body?: unknown) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { "X-Shopify-Access-Token": TOKEN, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(JSON.stringify(data.errors ?? data));
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  try {
    const { action, productId, available, price } = await req.json();

    // Variante principale + article d'inventaire
    const prod = await shopify(`/products/${productId}.json`);
    const variant = prod.product.variants[0];
    const invItem = variant.inventory_item_id;

    // Niveau d'inventaire existant → on en déduit l'emplacement SANS lister les
    // emplacements (évite le scope read_locations, non accordé sur l'app).
    async function readLevel() {
      const lvl = await shopify(`/inventory_levels.json?inventory_item_ids=${invItem}`);
      return lvl.inventory_levels?.[0] ?? null;
    }

    if (action === "get") {
      const level = await readLevel();
      return json({ available: level?.available ?? 0, price: variant.price });
    }

    if (action === "set") {
      // S'assure que le suivi de stock est activé (+ met à jour le prix si fourni)
      const variantPatch: Record<string, unknown> = {
        id: variant.id,
        inventory_management: "shopify",
        inventory_policy: "deny",
      };
      const hasPrice = price !== undefined && price !== null && !Number.isNaN(Number(price));
      if (hasPrice) variantPatch.price = Number(price).toFixed(2);
      await shopify(`/variants/${variant.id}.json`, "PUT", { variant: variantPatch });

      // Emplacement : celui du niveau existant. Sinon, on tente la liste des
      // emplacements (nécessite read_locations) en dernier recours seulement.
      let level = await readLevel();
      let locationId = level?.location_id;
      if (!locationId) {
        try {
          const { locations } = await shopify(`/locations.json`);
          const loc = locations.find((l: any) => l.active) ?? locations[0];
          locationId = loc?.id;
          if (locationId) {
            await shopify(`/inventory_levels/connect.json`, "POST", {
              location_id: locationId,
              inventory_item_id: invItem,
            }).catch(() => {});
          }
        } catch (_) {
          throw new Error(
            "Impossible de trouver l'emplacement de stock. Active le suivi de stock sur ce produit dans Shopify, ou accorde le scope read_locations."
          );
        }
      }

      const newAvail = Math.max(0, Number(available) || 0);
      await shopify(`/inventory_levels/set.json`, "POST", {
        location_id: locationId,
        inventory_item_id: invItem,
        available: newAvail,
      });
      return json({ available: newAvail, price: hasPrice ? Number(price).toFixed(2) : variant.price });
    }

    return json({ error: "action inconnue" }, 400);
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
