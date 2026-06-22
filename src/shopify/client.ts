import { createStorefrontApiClient } from "@shopify/storefront-api-client";
import {
  SHOPIFY_STORE_DOMAIN,
  SHOPIFY_STOREFRONT_TOKEN,
  STOREFRONT_API_VERSION,
} from "../config/shopify";

/**
 * Client unique pour parler à la Storefront API de Shopify.
 * Tous les écrans passent par ce client pour récupérer produits, prix, stock...
 */
export const shopifyClient = createStorefrontApiClient({
  storeDomain: SHOPIFY_STORE_DOMAIN,
  apiVersion: STOREFRONT_API_VERSION,
  publicAccessToken: SHOPIFY_STOREFRONT_TOKEN,
});

/**
 * Petit utilitaire : exécute une requête GraphQL et renvoie les données,
 * en remontant une erreur claire si Shopify répond une erreur.
 */
export async function shopifyRequest<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const { data, errors } = await shopifyClient.request<T>(query, { variables });

  if (errors) {
    const message =
      errors.message ?? errors.graphQLErrors?.[0]?.message ?? "Erreur Shopify";
    throw new Error(message);
  }

  if (!data) {
    throw new Error("Réponse vide de Shopify");
  }

  return data;
}
