/**
 * Mini-serveur sécurisé pour l'espace admin de l'app €ASH.
 *
 * Rôle : recevoir un produit (titre, prix, stock, photos) depuis l'app, et le
 * créer sur Shopify via l'API Admin — ce qui crée le stock automatiquement.
 *
 * 🔐 Le jeton Admin Shopify (tout-puissant) vit UNIQUEMENT ici, côté serveur,
 * dans une variable d'environnement. Il n'est jamais envoyé à l'app.
 *
 * Variables d'environnement requises (voir .env.example) :
 *   SHOPIFY_STORE_DOMAIN   ex: happycash16.myshopify.com
 *   SHOPIFY_ADMIN_TOKEN    jeton d'accès Admin API (secret)
 *   ADMIN_SECRET           mot de passe que TOI seul connais (protège l'app admin)
 *   SHOPIFY_API_VERSION    (optionnel) défaut: 2025-04
 *   PORT                   (optionnel) défaut: 3000
 */

import express from "express";

const {
  SHOPIFY_STORE_DOMAIN,
  SHOPIFY_ADMIN_TOKEN,
  ADMIN_SECRET,
  SHOPIFY_API_VERSION = "2025-04",
  PORT = 3000,
} = process.env;

if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_ADMIN_TOKEN || !ADMIN_SECRET) {
  console.error(
    "❌ Variables manquantes : SHOPIFY_STORE_DOMAIN, SHOPIFY_ADMIN_TOKEN, ADMIN_SECRET sont obligatoires."
  );
  process.exit(1);
}

const API = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}`;

const app = express();
app.use(express.json({ limit: "30mb" })); // images en base64 → corps volumineux

/** Appel générique à l'API Admin REST de Shopify. */
async function shopify(path, method = "GET", body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      "X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const msg = data.errors ? JSON.stringify(data.errors) : `HTTP ${res.status}`;
    throw new Error(`Shopify: ${msg}`);
  }
  return data;
}

/** Vérifie le mot de passe admin envoyé par l'app. */
function requireAdmin(req, res, next) {
  if (req.get("x-admin-secret") !== ADMIN_SECRET) {
    return res.status(401).json({ error: "Mot de passe admin incorrect." });
  }
  next();
}

// Vérifie que le serveur tourne.
app.get("/health", (_req, res) => res.json({ ok: true }));

// Permet à l'app de vérifier le mot de passe admin (écran de connexion admin).
app.post("/admin/check", requireAdmin, (_req, res) => res.json({ ok: true }));

/**
 * Crée un produit sur Shopify (+ stock + photos + rubrique).
 * Corps attendu :
 *   { title, description, price, quantity, productType?, collectionId?, images? }
 *   images = tableau de chaînes base64 (sans préfixe data:)
 */
app.post("/admin/products", requireAdmin, async (req, res) => {
  try {
    const {
      title,
      description = "",
      price,
      quantity = 0,
      productType = "",
      collectionId,
      images = [],
    } = req.body || {};

    if (!title || price === undefined || price === "") {
      return res.status(400).json({ error: "Le titre et le prix sont obligatoires." });
    }

    // 1) Création du produit avec sa variante (prix) et ses photos.
    const productPayload = {
      product: {
        title,
        body_html: description,
        status: "active",
        product_type: productType,
        variants: [
          {
            price: String(price),
            inventory_management: "shopify",
            inventory_policy: "deny",
          },
        ],
        images: images
          .filter(Boolean)
          .map((attachment) => ({ attachment })),
      },
    };
    const created = await shopify("/products.json", "POST", productPayload);
    const product = created.product;
    const variant = product.variants[0];

    // 2) Mise à jour du stock (nécessite l'emplacement d'inventaire).
    const qty = Number(quantity) || 0;
    if (qty > 0 && variant?.inventory_item_id) {
      const { locations } = await shopify("/locations.json");
      const location = locations.find((l) => l.active) || locations[0];
      if (location) {
        // On rattache l'article à l'emplacement (ignore si déjà rattaché),
        // puis on fixe la quantité disponible.
        try {
          await shopify("/inventory_levels/connect.json", "POST", {
            location_id: location.id,
            inventory_item_id: variant.inventory_item_id,
          });
        } catch {
          /* déjà rattaché : on continue */
        }
        await shopify("/inventory_levels/set.json", "POST", {
          location_id: location.id,
          inventory_item_id: variant.inventory_item_id,
          available: qty,
        });
      }
    }

    // 3) Ajout à une rubrique (collection) si fournie — au mieux.
    let collectionWarning;
    if (collectionId) {
      try {
        await shopify("/collects.json", "POST", {
          collect: { product_id: product.id, collection_id: Number(collectionId) },
        });
      } catch (e) {
        // Les collections "automatiques" (par tags) refusent l'ajout manuel.
        collectionWarning =
          "Produit créé, mais la rubrique est automatique : ajoute les bons tags/critères pour qu'il y apparaisse.";
      }
    }

    res.json({
      ok: true,
      productId: product.id,
      handle: product.handle,
      adminUrl: `https://${SHOPIFY_STORE_DOMAIN}/admin/products/${product.id}`,
      warning: collectionWarning,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Erreur lors de la création du produit." });
  }
});

app.listen(PORT, () => console.log(`✅ Serveur admin €ASH démarré sur le port ${PORT}`));
