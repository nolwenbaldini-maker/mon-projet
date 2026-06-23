import { supabase } from "./supabase";

/** Données du client lues dans la base Lovable Cloud (Supabase), via sa session. */

export interface Profile {
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
}

export interface LinkedOrder {
  id: string;
  order_name: string | null;
  order_email: string | null;
  order_phone: string | null;
}

export interface RachatRequest {
  id: string;
  description: string | null;
  photo_urls: string[] | null;
  status: string | null;
  admin_notes: string | null;
  created_at: string;
}

export interface RachatMessage {
  id: string;
  sender: string;
  content: string;
  created_at: string;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("first_name, last_name, phone")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getLinkedOrders(userId: string): Promise<LinkedOrder[]> {
  const { data, error } = await supabase
    .from("linked_orders")
    .select("id, order_name, order_email, order_phone")
    .eq("user_id", userId);
  if (error) throw error;
  return data ?? [];
}

export async function getRachatRequests(userId: string): Promise<RachatRequest[]> {
  const { data, error } = await supabase
    .from("rachat_requests")
    .select("id, description, photo_urls, status, admin_notes, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getRachatMessages(requestId: string): Promise<RachatMessage[]> {
  const { data, error } = await supabase
    .from("rachat_messages")
    .select("id, sender, content, created_at")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function sendRachatMessage(requestId: string, content: string): Promise<void> {
  const { error } = await supabase
    .from("rachat_messages")
    .insert({ request_id: requestId, sender: "client", content });
  if (error) throw error;
}

/** Vrai si l'utilisateur a le rôle admin (table user_roles). */
export async function isAdminUser(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (error) return false;
    return (data ?? []).some((r: any) => String(r.role).toLowerCase() === "admin");
  } catch {
    return false;
  }
}
