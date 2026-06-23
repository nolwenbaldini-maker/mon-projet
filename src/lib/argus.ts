import { supabase } from "./supabase";

/** Argus (cote de reprise) — mêmes tables et fonctions que le site cash16.fr. */

/** États d'estimation côté client (libellés + descriptions repris du site). */
export const ESTIMATION_STATES: {
  label: string;
  description: string;
  priceKey: "price_perfect" | "price_good" | "price_correct";
}[] = [
  {
    label: "Parfait état",
    description:
      "Comme neuf : aucune rayure, aucun choc visible, impeccable et parfaitement fonctionnel.",
    priceKey: "price_perfect",
  },
  {
    label: "Bon état",
    description:
      "Quelques micro-rayures discrètes, légères marques d'usage. Tout fonctionne normalement.",
    priceKey: "price_good",
  },
  {
    label: "État correct",
    description:
      "Rayures bien visibles, traces d'usure marquées, mais l'appareil fonctionne sans problème.",
    priceKey: "price_correct",
  },
];

export interface ArgusSmartphone {
  id: string;
  brand: string;
  model: string;
  color: string | null;
  capacity: string | null;
  price_perfect: number | null;
  price_good: number | null;
  price_correct: number | null;
}

export interface ArgusConsole {
  id: string;
  brand: string;
  family: string | null;
  model: string;
  capacity: string | null;
  price_perfect: number | null;
  price_good: number | null;
  price_correct: number | null;
}

export interface ArgusSyncLog {
  id: string;
  created_at: string;
  status?: string | null;
  brand?: string | null;
  message?: string | null;
  [key: string]: any;
}

export async function getArgusSmartphones(): Promise<ArgusSmartphone[]> {
  const { data, error } = await supabase
    .from("argus_smartphones")
    .select("id, brand, model, color, capacity, price_perfect, price_good, price_correct")
    .order("brand")
    .order("model");
  if (error) throw error;
  return data ?? [];
}

export async function getArgusConsoles(): Promise<ArgusConsole[]> {
  const { data, error } = await supabase
    .from("argus_consoles")
    .select("id, brand, family, model, capacity, price_perfect, price_good, price_correct")
    .order("brand")
    .order("family")
    .order("model");
  if (error) throw error;
  return data ?? [];
}

export async function getArgusSyncLogs(): Promise<ArgusSyncLog[]> {
  const { data, error } = await supabase
    .from("argus_sync_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) throw error;
  return data ?? [];
}

/** Lance l'actualisation de l'argus smartphones pour une marque. */
export async function syncArgusSmartphones(brand: string): Promise<void> {
  const { error } = await supabase.functions.invoke("sync-argus", { body: { brand } });
  if (error) throw new Error(error.message || "Échec de l'actualisation.");
}

/** Lance l'actualisation de l'argus consoles. */
export async function syncArgusConsoles(): Promise<void> {
  const { error } = await supabase.functions.invoke("sync-argus-consoles", { body: {} });
  if (error) throw new Error(error.message || "Échec de l'actualisation.");
}
