// Fonction Edge Lovable Cloud (Supabase) : "promo-scheduler"
// Programme des promotions avec date/heure de début et de fin, et les applique
// automatiquement à Shopify (donc visibles sur l'app ET le site).
//
// Prérequis :
//   - Table public.scheduled_promos (voir scheduled_promos.sql)
//   - Secret SHOPIFY_MANAGE_STOCK_TOKEN (jeton Admin permanent, shpat_…)
//   - Secret CRON_SECRET (une chaîne au hasard) pour protéger l'action "tick"
//   - Un cron (toutes les 5 min) qui appelle cette fonction avec { action: "tick" }
//     et l'en-tête  x-cron-secret: <CRON_SECRET>
//
// Actions (corps JSON) :
//   { action: "schedule", productId, productTitle, percent, startsAt, endsAt }  (admin)
//   { action: "list", productId? }                                             (admin)
//   { action: "cancel", id }                                                   (admin)
//   { action: "tick" }                                                         (cron)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const DOMAIN =
  (Deno.env.get("SHOPIFY_STORE_DOMAIN") ||
    Deno.env.get("SHOPIFY_SHOP_DOMAIN") ||
    "happycash16.myshopify.com").trim();
const API = `https://${DOMAIN}/admin/api/2024-10`;

const SB_URL = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/$/, "");
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ANON;

// --- Shopify (jeton Admin permanent) ---------------------------------------
function shopToken(): string {
  return (
    Deno.env.get("SHOPIFY_MANAGE_STOCK_TOKEN") ||
    Deno.env.get("SHOPIFY_ADMIN_TOKEN") ||
    Deno.env.get("SHOPIFY_ACCESS_TOKEN") ||
    ""
  ).trim();
}
async function shopify(path: string, method = "GET", body?: unknown) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { "X-Shopify-Access-Token": shopToken(), "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(JSON.stringify(data.errors ?? data));
  return data;
}

async function applyPromo(productId: number, percent: number) {
  const prod = await shopify(`/products/${productId}.json`);
  const variant = prod.product.variants[0];
  const curPrice = Number(variant.price) || 0;
  const curCompare = variant.compare_at_price ? Number(variant.compare_at_price) : 0;
  const base = curCompare > curPrice ? curCompare : curPrice;
  const newPrice = Math.round(base * (1 - percent / 100) * 100) / 100;
  await shopify(`/variants/${variant.id}.json`, "PUT", {
    variant: { id: variant.id, price: newPrice.toFixed(2), compare_at_price: base.toFixed(2) },
  });
  await setPromoTag(prod, productId, true);
}
async function removePromo(productId: number) {
  const prod = await shopify(`/products/${productId}.json`);
  const variant = prod.product.variants[0];
  const curCompare = variant.compare_at_price ? Number(variant.compare_at_price) : 0;
  const patch: Record<string, unknown> = { id: variant.id, compare_at_price: null };
  if (curCompare > 0) patch.price = curCompare.toFixed(2);
  await shopify(`/variants/${variant.id}.json`, "PUT", { variant: patch });
  await setPromoTag(prod, productId, false);
}
async function setPromoTag(prod: any, productId: number, on: boolean) {
  const existing = String(prod.product.tags || "")
    .split(",")
    .map((t: string) => t.trim())
    .filter(Boolean);
  const has = existing.some((t: string) => t.toLowerCase() === "promo");
  let next = existing;
  if (on && !has) next = [...existing, "promo"];
  if (!on) next = existing.filter((t: string) => t.toLowerCase() !== "promo");
  await shopify(`/products/${productId}.json`, "PUT", {
    product: { id: productId, tags: next.join(", ") },
  });
}

// --- Supabase REST (service role) ------------------------------------------
async function sb(path: string, method = "GET", body?: unknown) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SERVICE,
      Authorization: `Bearer ${SERVICE}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => []);
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

async function assertAdmin(req: Request): Promise<string> {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) throw new Error("AUTH: connexion requise.");
  const ures = await fetch(`${SB_URL}/auth/v1/user`, {
    headers: { Authorization: authHeader, apikey: ANON },
  });
  if (!ures.ok) throw new Error("AUTH: session invalide.");
  const user = await ures.json().catch(() => null);
  const uid = user?.id;
  if (!uid) throw new Error("AUTH: session invalide.");
  const roles = await sb(`user_roles?select=role&user_id=eq.${uid}`).catch(() => []);
  const isAdmin =
    Array.isArray(roles) && roles.some((r: any) => String(r.role).toLowerCase() === "admin");
  if (!isAdmin) throw new Error("AUTH: accès réservé aux administrateurs.");
  return uid;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

  const body = await req.json().catch(() => ({}));
  const { action } = body as any;

  try {
    // --- CRON : applique/retire les promos dues -----------------------------
    if (action === "tick") {
      const secret = req.headers.get("x-cron-secret") ?? "";
      const expected = Deno.env.get("CRON_SECRET") ?? "";
      if (!expected || secret !== expected) return json({ error: "forbidden" }, 403);

      const now = new Date().toISOString();
      const rows: any[] = await sb(
        `scheduled_promos?status=in.(scheduled,active)&select=*`
      );
      let started = 0, ended = 0, failed = 0;
      for (const r of rows) {
        try {
          if (r.status === "scheduled" && r.starts_at <= now && r.ends_at > now) {
            await applyPromo(Number(r.product_id), Number(r.percent));
            await sb(`scheduled_promos?id=eq.${r.id}`, "PATCH", { status: "active", last_error: null });
            started++;
          } else if (
            (r.status === "active" || r.status === "scheduled") &&
            r.ends_at <= now
          ) {
            // La promo est terminée (ou a été programmée entièrement dans le passé).
            if (r.status === "active") await removePromo(Number(r.product_id));
            await sb(`scheduled_promos?id=eq.${r.id}`, "PATCH", { status: "done", last_error: null });
            ended++;
          }
        } catch (e) {
          failed++;
          await sb(`scheduled_promos?id=eq.${r.id}`, "PATCH", {
            status: "error",
            last_error: String((e as Error)?.message ?? e).slice(0, 300),
          }).catch(() => {});
        }
      }
      return json({ ok: true, started, ended, failed, checked: rows.length });
    }

    // --- Actions admin ------------------------------------------------------
    const uid = await assertAdmin(req);

    if (action === "schedule") {
      const { productId, productTitle, percent, startsAt, endsAt } = body as any;
      if (!productId || !percent || !startsAt || !endsAt)
        return json({ error: "Champs requis manquants." }, 400);
      const inserted = await sb(`scheduled_promos`, "POST", {
        product_id: Number(productId),
        product_title: productTitle ?? null,
        percent: Math.round(Number(percent)),
        starts_at: startsAt,
        ends_at: endsAt,
        status: "scheduled",
        created_by: uid,
      });
      // Si le début est déjà passé (et la fin future), on applique tout de suite.
      const now = new Date().toISOString();
      const row = Array.isArray(inserted) ? inserted[0] : inserted;
      if (row && startsAt <= now && endsAt > now) {
        try {
          await applyPromo(Number(productId), Math.round(Number(percent)));
          await sb(`scheduled_promos?id=eq.${row.id}`, "PATCH", { status: "active" });
        } catch (e) {
          await sb(`scheduled_promos?id=eq.${row.id}`, "PATCH", {
            status: "error",
            last_error: String((e as Error)?.message ?? e).slice(0, 300),
          }).catch(() => {});
        }
      }
      return json({ ok: true });
    }

    if (action === "list") {
      const { productId } = body as any;
      const filter = productId ? `&product_id=eq.${Number(productId)}` : "";
      const promos = await sb(
        `scheduled_promos?select=*${filter}&order=starts_at.desc&limit=50`
      );
      return json({ promos });
    }

    if (action === "cancel") {
      const { id } = body as any;
      if (!id) return json({ error: "id manquant" }, 400);
      const rows: any[] = await sb(`scheduled_promos?id=eq.${id}&select=*`);
      const row = rows[0];
      if (row && row.status === "active") {
        try {
          await removePromo(Number(row.product_id));
        } catch (_) {
          // on annule quand même
        }
      }
      await sb(`scheduled_promos?id=eq.${id}`, "PATCH", { status: "cancelled" });
      return json({ ok: true });
    }

    return json({ error: "action inconnue" }, 400);
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    const status = msg.startsWith("AUTH:") ? 403 : 500;
    return json({ error: msg }, status);
  }
});
