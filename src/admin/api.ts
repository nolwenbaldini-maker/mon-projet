import { ADMIN_API_URL } from "../config/admin";

export interface NewProduct {
  title: string;
  description: string;
  price: string;
  quantity: number;
  productType?: string;
  /** Identifiant numérique de la collection Shopify (optionnel). */
  collectionId?: string;
  /** Photos en base64 (sans préfixe data:). */
  images: string[];
}

export interface CreateResult {
  ok: true;
  productId: number;
  handle: string;
  adminUrl: string;
  warning?: string;
}

/** Vérifie le mot de passe admin auprès du serveur. */
export async function adminCheck(secret: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${ADMIN_API_URL}/admin/check`, {
      method: "POST",
      headers: { "x-admin-secret": secret },
    });
  } catch {
    throw new Error("Serveur injoignable. Vérifie l'URL et ta connexion.");
  }
  if (res.status === 401) throw new Error("Mot de passe admin incorrect.");
  if (!res.ok) throw new Error("Le serveur a renvoyé une erreur.");
}

/** Crée un produit via le serveur admin (qui appelle Shopify). */
export async function adminCreateProduct(
  secret: string,
  product: NewProduct
): Promise<CreateResult> {
  let res: Response;
  try {
    res = await fetch(`${ADMIN_API_URL}/admin/products`, {
      method: "POST",
      headers: { "x-admin-secret": secret, "Content-Type": "application/json" },
      body: JSON.stringify(product),
    });
  } catch {
    throw new Error("Serveur injoignable. Vérifie ta connexion.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Échec de la création du produit.");
  }
  return data as CreateResult;
}
