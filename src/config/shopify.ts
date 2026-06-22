/**
 * Configuration de la connexion à ta boutique Shopify.
 *
 * ⚠️ À REMPLIR avant de lancer l'app (voir le README, section "Connecter Shopify").
 *
 * Comment obtenir ces 2 valeurs :
 * 1. Va sur ton admin Shopify → Paramètres → Applications et canaux de vente
 *    → Développer des applications → Créer une application.
 * 2. Dans l'onglet "Configuration", active "Storefront API" et coche les
 *    permissions de lecture (produits, collections) et de panier (cart).
 * 3. Installe l'application puis copie le "Storefront API access token".
 *
 * Le domaine est ton domaine technique Shopify, du type "cash16.myshopify.com"
 * (PAS "cash16.fr"). Tu le trouves dans Paramètres → Domaines.
 */

// Exemple : "cash16.myshopify.com"
export const SHOPIFY_STORE_DOMAIN = "VOTRE-BOUTIQUE.myshopify.com";

// Jeton public Storefront API (commence souvent par des lettres/chiffres)
export const SHOPIFY_STOREFRONT_TOKEN = "VOTRE_STOREFRONT_ACCESS_TOKEN";

// Version de l'API Shopify. On peut la laisser telle quelle.
export const STOREFRONT_API_VERSION = "2025-04";

/** Renvoie true tant que la config n'a pas été remplie. */
export const isShopifyConfigured = (): boolean =>
  !SHOPIFY_STORE_DOMAIN.includes("VOTRE-BOUTIQUE") &&
  !SHOPIFY_STOREFRONT_TOKEN.includes("VOTRE_");
