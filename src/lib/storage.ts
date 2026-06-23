import { decode } from "base64-arraybuffer";
import { supabase } from "./supabase";

/**
 * Envoie des images (en base64) dans un bucket Supabase Storage
 * et renvoie leurs URL publiques. Mêmes buckets que le site :
 * "product-photos" (admin) et "rachat-photos" (clients).
 */
export async function uploadImages(
  bucket: string,
  base64Images: string[],
  prefix = "img"
): Promise<string[]> {
  const urls: string[] = [];
  for (let i = 0; i < base64Images.length; i++) {
    const path = `${prefix}-${Date.now()}-${i}.jpg`;
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, decode(base64Images[i]), {
        contentType: "image/jpeg",
        upsert: false,
      });
    if (error) throw new Error(`Envoi photo échoué : ${error.message}`);
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    urls.push(data.publicUrl);
  }
  return urls;
}
