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
//   { action: "get", productId }
//        -> { available, price, compareAtPrice }
//   { action: "set", productId, available, price?, promoPercent?, removePromo? }
//        -> { available, price, compareAtPrice }
//   (available = 0  => rupture => le produit disparaît du site)
//   (price présent     => met à jour le prix de la variante principale)
//   (promoPercent > 0  => applique une promo : prix barré = base, prix = base×(1−%),
//                         + ajoute la balise "promo")
//   (removePromo       => retire la promo : restaure le prix barré comme prix,
//                         efface le prix barré, retire la balise "promo")

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Vérifie que l'appelant est bien un admin (table user_roles), côté serveur.
// La protection « contrôle admin » de Lovable doit RESTER active : ceci est
// une sécurité supplémentaire, pas un remplacement.
async function assertAdmin(req: Request): Promise<void> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!authHeader) throw new Error("AUTH: connexion requise.");
  const sb = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await sb.auth.getUser();
  if (userErr || !userData?.user) throw new Error("AUTH: session invalide.");
  const { data: roles } = await sb
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id);
  const isAdmin = (roles ?? []).some(
    (r: any) => String(r.role).toLowerCase() === "admin"
  );
  if (!isAdmin) throw new Error("AUTH: accès réservé aux administrateurs.");
}

// Domaine de la boutique (public, pas un secret). On lit d'abord les variables
// d'environnement ; à défaut on retombe sur le domaine connu de la boutique,
// pour éviter une URL vide (erreur DNS "https://admin/...").
const DOMAIN =
  (Deno.env.get("SHOPIFY_STORE_DOMAIN") ||
    Deno.env.get("SHOPIFY_SHOP_DOMAIN") ||
    Deno.env.get("SHOPIFY_DOMAIN") ||
    "happycash16.myshopify.com").trim();

// Choix du jeton Admin : on regarde TOUTES les variables candidates et on
// privilégie celle qui ressemble à un vrai jeton Admin (préfixe "shpat_"),
// pour éviter de tomber sur une variable vide ou un mauvais jeton (ex. le
// jeton Storefront). Doit correspondre au secret de tes fonctions create-shopify-*.
const TOKEN_VAR_NAMES = [
  "SHOPIFY_ADMIN_TOKEN",
  "SHOPIFY_ADMIN_ACCESS_TOKEN",
  "SHOPIFY_ADMIN_API_ACCESS_TOKEN",
  "SHOPIFY_ADMIN_API_TOKEN",
  "SHOPIFY_ACCESS_TOKEN",
  "SHOPIFY_API_TOKEN",
  "SHOPIFY_API_ACCESS_TOKEN",
  "SHOPIFY_STOREFRONT_ADMIN_TOKEN",
];
function pickToken(): string {
  const env = Deno.env.toObject();
  // 1) N'IMPORTE quelle variable dont la valeur ressemble à un jeton Admin
  //    custom app ("shpat_…"), peu importe son nom.
  const anyShpat = Object.values(env)
    .map((v) => (v || "").trim())
    .find((v) => v.startsWith("shpat_"));
  if (anyShpat) return anyShpat;
  // 2) sinon, une des variables candidates connues, non vide
  for (const n of TOKEN_VAR_NAMES) {
    const v = (Deno.env.get(n) || "").trim();
    if (v) return v;
  }
  return "";
}
const TOKEN = pickToken();
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
    // Sécurité : seul un administrateur connecté peut agir sur les stocks/prix.
    await assertAdmin(req);

    const { action, productId, available, price, promoPercent, removePromo } = await req.json();

    // Diagnostic : ne révèle PAS le jeton. Liste les variables Shopify (noms)
    // et TESTE réellement le jeton contre /shop.json sur plusieurs versions
    // d'API, pour savoir si le jeton est valide (200) ou périmé (401).
    if (action === "diag") {
      const env = Deno.env.toObject();
      const vars: Record<string, number> = {};
      let shpatCount = 0;
      for (const [name, value] of Object.entries(env)) {
        const v = (value || "").trim();
        if (/shopify|shop|token/i.test(name)) vars[name] = v.length; // nom + longueur, jamais la valeur
        if (v.startsWith("shpat_")) shpatCount++;
      }
      // Test du jeton sur quelques versions d'API.
      const versions = ["2025-04", "2025-07", "2025-10", "2026-01", "2024-10"];
      const shopTests: Record<string, string> = {};
      for (const ver of versions) {
        try {
          const r = await fetch(`https://${DOMAIN}/admin/api/${ver}/shop.json`, {
            headers: { "X-Shopify-Access-Token": TOKEN },
          });
          let shopName = "";
          if (r.ok) {
            const b = await r.json().catch(() => ({}));
            shopName = b?.shop?.myshopify_domain || b?.shop?.name || "ok";
          }
          shopTests[ver] = r.ok ? `200 (${shopName})` : String(r.status);
        } catch (err) {
          shopTests[ver] = "ERR " + String((err as Error)?.message ?? err).slice(0, 40);
        }
      }
      return json({
        domain: DOMAIN || "(vide)",
        tokenLooksAdmin: TOKEN.startsWith("shpat_"),
        tokenLength: TOKEN.length,
        shpatCount,
        tokenVarsPresent: vars,
        shopTests,
      });
    }

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
      return json({
        available: level?.available ?? 0,
        price: variant.price,
        compareAtPrice: variant.compare_at_price ?? null,
      });
    }

    if (action === "set") {
      // S'assure que le suivi de stock est activé (+ met à jour le prix si fourni)
      const variantPatch: Record<string, unknown> = {
        id: variant.id,
        inventory_management: "shopify",
        inventory_policy: "deny",
      };

      const curPrice = Number(variant.price) || 0;
      const curCompare = variant.compare_at_price ? Number(variant.compare_at_price) : 0;
      const hasPrice = price !== undefined && price !== null && !Number.isNaN(Number(price));
      const pct = promoPercent !== undefined && promoPercent !== null ? Number(promoPercent) : 0;

      let finalPrice = hasPrice ? Number(price) : curPrice;
      let finalCompare: number | null = curCompare > 0 ? curCompare : null;
      let tagsOp: "add" | "remove" | null = null;

      if (pct > 0) {
        // Base de la promo : le prix barré existant s'il dépasse le prix,
        // sinon le prix (explicite ou actuel). On applique -pct%.
        const base = curCompare > curPrice ? curCompare : finalPrice;
        finalCompare = base;
        finalPrice = Math.round(base * (1 - pct / 100) * 100) / 100;
        tagsOp = "add";
      } else if (removePromo) {
        // Retour au prix normal : on restaure le prix barré comme prix.
        if (curCompare > 0) finalPrice = curCompare;
        finalCompare = null;
        tagsOp = "remove";
      }

      variantPatch.price = finalPrice.toFixed(2);
      // null efface le prix barré ; sinon on le fixe.
      variantPatch.compare_at_price = finalCompare != null ? finalCompare.toFixed(2) : null;
      await shopify(`/variants/${variant.id}.json`, "PUT", { variant: variantPatch });

      // Balise « promo » au niveau produit (tags = chaîne séparée par des virgules).
      if (tagsOp) {
        const existing = String(prod.product.tags || "")
          .split(",")
          .map((t: string) => t.trim())
          .filter(Boolean);
        const hasPromo = existing.some((t: string) => t.toLowerCase() === "promo");
        let nextTags = existing;
        if (tagsOp === "add" && !hasPromo) nextTags = [...existing, "promo"];
        if (tagsOp === "remove") nextTags = existing.filter((t: string) => t.toLowerCase() !== "promo");
        await shopify(`/products/${productId}.json`, "PUT", {
          product: { id: Number(productId), tags: nextTags.join(", ") },
        });
      }

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
      return json({
        available: newAvail,
        price: finalPrice.toFixed(2),
        compareAtPrice: finalCompare != null ? finalCompare.toFixed(2) : null,
      });
    }

    return json({ error: "action inconnue" }, 400);
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    const status = msg.startsWith("AUTH:") ? 403 : 500;
    return json({ error: msg }, status);
  }
});
