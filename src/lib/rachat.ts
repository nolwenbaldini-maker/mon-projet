import { supabase } from "./supabase";

/**
 * Modère une photo via la fonction Lovable Cloud "moderate-image".
 * Best-effort : en cas de doute ou d'erreur, on ne bloque pas l'envoi.
 * Renvoie false uniquement si la photo est explicitement rejetée.
 */
export async function moderateImage(base64: string, mimeType = "image/jpeg"): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke("moderate-image", {
      body: { imageBase64: base64, mimeType },
    });
    if (error) return true;
    if (data && (data.flagged === true || data.safe === false || data.approved === false)) {
      return false;
    }
    return true;
  } catch {
    return true;
  }
}

/** Crée une demande de rachat pour le client connecté. */
export async function createRachatRequest(
  userId: string,
  description: string,
  photoUrls: string[]
): Promise<void> {
  const { error } = await supabase.from("rachat_requests").insert({
    user_id: userId,
    description,
    photo_urls: photoUrls,
    status: "en_attente",
  });
  if (error) throw new Error(error.message);
}
