/**
 * Configuration de la connexion à ta boutique Shopify.
 *
 * 🔐 SÉCURITÉ : on n'écrit JAMAIS les identifiants ici (ils seraient publiés sur
 * Git). Ils sont lus depuis un fichier ".env" local, qui reste sur ta machine
 * et n'est pas envoyé sur GitHub. Copie ".env.example" en ".env" et remplis-le.
 *
 * Expo expose automatiquement les variables préfixées par "EXPO_PUBLIC_".
 *
 * Comment obtenir les valeurs :
 * 1. Va sur ton admin Shopify → Paramètres → Applications et canaux de vente
 *    → Développer des applications → Créer une application.
 * 2. Dans l'onglet "Configuration", active "Storefront API" et coche les
 *    permissions de lecture (produits, collections) et de panier (cart).
 * 3. Installe l'application puis copie le "Storefront API access token".
 *
 * Le domaine est ton domaine technique Shopify, du type "cash16.myshopify.com"
 * (PAS "cash16.fr"). Tu le trouves dans Paramètres → Domaines.
 */

// Domaine technique, ex. "cash16.myshopify.com"
export const SHOPIFY_STORE_DOMAIN =
  process.env.EXPO_PUBLIC_SHOPIFY_DOMAIN ?? "VOTRE-BOUTIQUE.myshopify.com";

// Jeton public Storefront API
export const SHOPIFY_STOREFRONT_TOKEN =
  process.env.EXPO_PUBLIC_SHOPIFY_STOREFRONT_TOKEN ?? "VOTRE_STOREFRONT_ACCESS_TOKEN";

// Version de l'API Shopify. On peut la laisser telle quelle.
export const STOREFRONT_API_VERSION =
  process.env.EXPO_PUBLIC_SHOPIFY_API_VERSION ?? "2025-04";

/** Renvoie true tant que la config n'a pas été remplie. */
export const isShopifyConfigured = (): boolean =>
  !SHOPIFY_STORE_DOMAIN.includes("VOTRE-BOUTIQUE") &&
  !SHOPIFY_STOREFRONT_TOKEN.includes("VOTRE_");
