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
//   { action: "get", productId: number }                 -> { available: number }
//   { action: "set", productId: number, available: number } -> { available: number }
//   (available = 0  => rupture => le produit disparaît du site)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const DOMAIN = Deno.env.get("SHOPIFY_STORE_DOMAIN")!;
const TOKEN =
  Deno.env.get("SHOPIFY_ADMIN_TOKEN") ??
  Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN") ??
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
    const { action, productId, available } = await req.json();

    // Variante principale + emplacement d'inventaire
    const prod = await shopify(`/products/${productId}.json`);
    const variant = prod.product.variants[0];
    const invItem = variant.inventory_item_id;
    const { locations } = await shopify(`/locations.json`);
    const loc = locations.find((l: any) => l.active) ?? locations[0];

    if (action === "get") {
      const lvl = await shopify(`/inventory_levels.json?inventory_item_ids=${invItem}`);
      const a = lvl.inventory_levels?.[0]?.available ?? 0;
      return json({ available: a });
    }

    if (action === "set") {
      // S'assure que le suivi de stock est activé
      await shopify(`/variants/${variant.id}.json`, "PUT", {
        variant: { id: variant.id, inventory_management: "shopify", inventory_policy: "deny" },
      });
      try {
        await shopify(`/inventory_levels/connect.json`, "POST", {
          location_id: loc.id,
          inventory_item_id: invItem,
        });
      } catch (_) {
        // déjà rattaché : on continue
      }
      await shopify(`/inventory_levels/set.json`, "POST", {
        location_id: loc.id,
        inventory_item_id: invItem,
        available: Math.max(0, Number(available) || 0),
      });
      return json({ available: Math.max(0, Number(available) || 0) });
    }

    return json({ error: "action inconnue" }, 400);
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
