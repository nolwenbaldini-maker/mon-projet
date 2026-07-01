import { supabase } from "./supabase";

/** Promotions programmées (début/fin) — appliquées côté serveur par un cron. */

export interface ScheduledPromo {
  id: string;
  product_id: number;
  product_title: string | null;
  percent: number;
  starts_at: string; // ISO
  ends_at: string; // ISO
  status: "scheduled" | "active" | "done" | "cancelled" | "error";
  last_error?: string | null;
}

async function fnError(error: any): Promise<string> {
  const ctx = error?.context;
  try {
    if (ctx && typeof ctx.clone === "function") {
      const b = await ctx.clone().json().catch(() => null);
      if (b) return b.error || b.message || JSON.stringify(b);
    }
  } catch {}
  if (ctx?.status === 404)
    return "404 — fonction « promo-scheduler » introuvable (pas déployée côté Lovable ?).";
  return error?.message || "Erreur de programmation.";
}

/**
 * Programme une promo : début et fin (objets Date, heure locale de l'appareil).
 * Le serveur l'appliquera et la retirera automatiquement aux heures indiquées.
 */
export async function schedulePromo(
  productId: number,
  productTitle: string,
  percent: number,
  startsAt: Date,
  endsAt: Date
): Promise<void> {
  const { error } = await supabase.functions.invoke("promo-scheduler", {
    body: {
      action: "schedule",
      productId,
      productTitle,
      percent: Math.round(percent),
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
    },
  });
  if (error) throw new Error(await fnError(error));
}

/** Liste les promos programmées (toutes, ou pour un produit donné). */
export async function listScheduledPromos(productId?: number): Promise<ScheduledPromo[]> {
  const { data, error } = await supabase.functions.invoke("promo-scheduler", {
    body: { action: "list", productId },
  });
  if (error) throw new Error(await fnError(error));
  return (data?.promos ?? []) as ScheduledPromo[];
}

/** Annule une promo programmée (et la retire si elle est déjà active). */
export async function cancelScheduledPromo(id: string): Promise<void> {
  const { error } = await supabase.functions.invoke("promo-scheduler", {
    body: { action: "cancel", id },
  });
  if (error) throw new Error(await fnError(error));
}

/**
 * Construit une Date à partir de champs « JJ/MM/AAAA » et « HH:MM » (heure locale).
 * Renvoie null si le format est invalide.
 */
export function parseDateTime(dateStr: string, timeStr: string): Date | null {
  const d = dateStr.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const t = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!d || !t) return null;
  const day = Number(d[1]);
  const month = Number(d[2]);
  const year = Number(d[3]);
  const hour = Number(t[1]);
  const min = Number(t[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || min > 59) return null;
  const dt = new Date(year, month - 1, day, hour, min, 0, 0);
  // Vérifie la cohérence (ex. 31/02 rejeté).
  if (dt.getDate() !== day || dt.getMonth() !== month - 1) return null;
  return dt;
}

/** Formate une date ISO en « JJ/MM/AAAA à HH:MM » (heure locale). */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} à ${p(d.getHours())}:${p(d.getMinutes())}`;
}
