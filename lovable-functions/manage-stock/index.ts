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

// Vérifie que l'appelant est bien un admin (table user_roles), côté serveur.
// IMPORTANT : pas d'import externe (esm.sh) ici — uniquement des fetch bruts,
// pour éviter que la fonction ne casse au chargement si l'import échoue.
// La protection « contrôle admin » de Lovable reste active : ceci est une
// sécurité supplémentaire.
async function assertAdmin(req: Request): Promise<string> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const url = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/$/, "");
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? anon;
  if (!authHeader) throw new Error("AUTH: connexion requise.");
  if (!url) throw new Error("AUTH: configuration Supabase manquante.");

  // 1) Identité de l'appelant à partir de son jeton de session.
  const ures = await fetch(`${url}/auth/v1/user`, {
    headers: { Authorization: authHeader, apikey: anon },
  });
  if (!ures.ok) throw new Error("AUTH: session invalide.");
  const user = await ures.json().catch(() => null);
  const uid = user?.id;
  if (!uid) throw new Error("AUTH: session invalide.");

  // 2) Rôle admin (service role pour ignorer la RLS).
  const rres = await fetch(
    `${url}/rest/v1/user_roles?select=role&user_id=eq.${uid}`,
    { headers: { apikey: service, Authorization: `Bearer ${service}` } }
  );
  const roles = rres.ok ? await rres.json().catch(() => []) : [];
  const isAdmin =
    Array.isArray(roles) &&
    roles.some((r: any) => String(r.role).toLowerCase() === "admin");
  if (!isAdmin) throw new Error("AUTH: accès réservé aux administrateurs.");
  return uid;
}

/**
 * Jeton Shopify à utiliser pour cet appel. La boutique utilise une appli OAuth
 * avec des jetons « online » par utilisateur (SHOPIFY_ONLINE_ACCESS_TOKEN:user:<uid>).
 * On prend donc en priorité celui de l'utilisateur connecté, sinon on retombe
 * sur un éventuel jeton fixe.
 */
function resolveToken(uid: string): string {
  // 1) Jeton DÉDIÉ permanent si tu en crées un (recommandé, n'expire jamais) :
  //    secret Lovable « SHOPIFY_MANAGE_STOCK_TOKEN » = jeton Admin custom app (shpat_…).
  const dedicated = (Deno.env.get("SHOPIFY_MANAGE_STOCK_TOKEN") || "").trim();
  if (dedicated) return dedicated;
  // 2) Jeton « online » de l'utilisateur connecté (se rafraîchit à la reconnexion).
  const online = (Deno.env.get(`SHOPIFY_ONLINE_ACCESS_TOKEN:user:${uid}`) || "").trim();
  if (online) return online;
  // 3) Repli : n'importe quel jeton online présent, puis le jeton fixe.
  try {
    const env = Deno.env.toObject();
    const anyOnline = Object.entries(env)
      .filter(([n]) => n.startsWith("SHOPIFY_ONLINE_ACCESS_TOKEN:user:"))
      .map(([, v]) => (v || "").trim())
      .find(Boolean);
    if (anyOnline) return anyOnline;
  } catch (_) {
    // ignore
  }
  return pickToken();
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

async function shopify(token: string, path: string, method = "GET", body?: unknown) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
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

  // Corps lu une seule fois.
  const body = await req.json().catch(() => ({}));
  const { action, productId, available, price, promoPercent, removePromo } = body as any;

  // DIAGNOSTIC : exécuté AVANT toute vérification, et le plus robuste possible,
  // pour qu'on puisse toujours voir l'état du jeton même si le reste casse.
  // Ne révèle PAS le jeton (seulement noms de variables + longueurs).
  if (action === "diag") {
    const vars: Record<string, number> = {};
    let shpatCount = 0;
    // Liste des jetons à tester : { étiquette courte -> valeur }.
    const candidates: { label: string; value: string }[] = [];
    try {
      const env = Deno.env.toObject();
      for (const [name, value] of Object.entries(env)) {
        const v = (value || "").trim();
        if (/shopify|shop|token/i.test(name)) vars[name] = v.length;
        if (v.startsWith("shpat_")) shpatCount++;
        // Tout ce qui ressemble à un jeton d'accès Shopify (y compris le jeton
        // dédié permanent SHOPIFY_MANAGE_STOCK_TOKEN, et toute valeur shpat_/shpua_).
        const looksToken =
          /access_token|manage_stock_token/i.test(name) ||
          v.startsWith("shpat_") ||
          v.startsWith("shpua_");
        if (v && looksToken) {
          let label = name.replace("SHOPIFY_", "");
          // Jetons "online" : on raccourcit l'uid (online:ABC…XYZ).
          const m = name.match(/SHOPIFY_ONLINE_ACCESS_TOKEN:user:(.+)$/);
          if (m) {
            const id = m[1];
            label = `online:${id.slice(0, 4)}…${id.slice(-3)}`;
          }
          candidates.push({ label, value: v });
        }
      }
    } catch (_) {
      // toObject indisponible : on teste au moins le jeton résolu par défaut.
    }
    if (candidates.length === 0) candidates.push({ label: "TOKEN", value: TOKEN });

    // On teste CHAQUE jeton contre /shop.json pour voir lequel est valide.
    const shopTests: Record<string, string> = {};
    for (const c of candidates) {
      try {
        const r = await fetch(`https://${DOMAIN}/admin/api/2024-10/shop.json`, {
          headers: { "X-Shopify-Access-Token": c.value },
        });
        let shopName = "";
        if (r.ok) {
          const b = await r.json().catch(() => ({}));
          shopName = b?.shop?.myshopify_domain || b?.shop?.name || "ok";
        }
        shopTests[c.label] = r.ok ? `200 ✅ (${shopName})` : String(r.status);
      } catch (err) {
        shopTests[c.label] = "ERR " + String((err as Error)?.message ?? err).slice(0, 40);
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

  try {
    // Sécurité : seul un administrateur connecté peut agir. On récupère son uid
    // pour utiliser SON jeton Shopify « online ».
    const uid = await assertAdmin(req);
    const token = resolveToken(uid);
    const sh = (path: string, method = "GET", b?: unknown) => shopify(token, path, method, b);

    // Variante principale + article d'inventaire
    const prod = await sh(`/products/${productId}.json`);
    const variant = prod.product.variants[0];
    const invItem = variant.inventory_item_id;

    // Niveau d'inventaire existant → on en déduit l'emplacement SANS lister les
    // emplacements (évite le scope read_locations, non accordé sur l'app).
    async function readLevel() {
      const lvl = await sh(`/inventory_levels.json?inventory_item_ids=${invItem}`);
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
      await sh(`/variants/${variant.id}.json`, "PUT", { variant: variantPatch });

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
        await sh(`/products/${productId}.json`, "PUT", {
          product: { id: Number(productId), tags: nextTags.join(", ") },
        });
      }

      // Emplacement : celui du niveau existant. Sinon, on tente la liste des
      // emplacements (nécessite read_locations) en dernier recours seulement.
      let level = await readLevel();
      let locationId = level?.location_id;
      if (!locationId) {
        try {
          const { locations } = await sh(`/locations.json`);
          const loc = locations.find((l: any) => l.active) ?? locations[0];
          locationId = loc?.id;
          if (locationId) {
            await sh(`/inventory_levels/connect.json`, "POST", {
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
      await sh(`/inventory_levels/set.json`, "POST", {
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
