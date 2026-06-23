/**
 * Connexion au même projet Supabase que le site cash16.fr
 * (c'est lui qui gère les comptes + la connexion Google).
 *
 * Ces valeurs sont publiques (la clé "anon" est faite pour vivre côté client,
 * comme le jeton Storefront). Elles sont lues depuis le fichier .env.
 */
export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? "https://rsypkgoknrjqzjnitmqu.supabase.co";

export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = (): boolean =>
  SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
