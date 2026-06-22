/**
 * URL du mini-serveur admin (celui qui détient le jeton Admin Shopify).
 * Définie dans le fichier .env via EXPO_PUBLIC_ADMIN_API_URL.
 * Ex: EXPO_PUBLIC_ADMIN_API_URL=https://cash16-admin-server.onrender.com
 */
export const ADMIN_API_URL = (process.env.EXPO_PUBLIC_ADMIN_API_URL ?? "").replace(
  /\/$/,
  ""
);

export const isAdminConfigured = (): boolean => ADMIN_API_URL.length > 0;
