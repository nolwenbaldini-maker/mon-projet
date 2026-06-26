import { shopifyRequest } from "./client";
import type { Cart, Collection, Product } from "./types";

/** Champs produit réutilisés dans plusieurs requêtes (image redimensionnée). */
const PRODUCT_FRAGMENT = /* GraphQL */ `
  fragment ProductFields on Product {
    id
    handle
    title
    description
    availableForSale
    featuredImage { url(transform: { maxWidth: 400, maxHeight: 400 }) altText }
    priceRange { minVariantPrice { amount currencyCode } }
    compareAtPriceRange { minVariantPrice { amount currencyCode } }
    variants(first: 10) {
      edges {
        node {
          id
          title
          availableForSale
          price { amount currencyCode }
        }
      }
    }
  }
`;

/** Transforme la structure edges/node de Shopify en simple tableau. */
function flattenProduct(node: any): Product {
  const compareAt = node.compareAtPriceRange?.minVariantPrice ?? null;
  return {
    ...node,
    compareAtPrice: compareAt && Number(compareAt.amount) > 0 ? compareAt : null,
    variants: node.variants.edges.map((e: any) => e.node),
    images: node.images ? node.images.edges.map((e: any) => e.node) : [],
  };
}

/**
 * Produits en promotion : balise « promo » + prix barré supérieur au prix.
 * Lecture publique (ne dépend pas du jeton Admin).
 */
export async function getPromoProducts(): Promise<Product[]> {
  const query = /* GraphQL */ `
    ${PRODUCT_FRAGMENT}
    query PromoProducts {
      products(first: 50, query: "tag:promo", sortKey: CREATED_AT, reverse: true) {
        edges { node { ...ProductFields } }
      }
    }
  `;
  const data = await shopifyRequest<any>(query);
  return data.products.edges
    .map((e: any) => flattenProduct(e.node))
    .filter((p: Product) => p.availableForSale) // pas de produits en rupture
    .filter((p: Product) => {
      // promo réelle uniquement : prix barré > prix actuel
      const price = Number(p.priceRange.minVariantPrice.amount);
      const compare = p.compareAtPrice ? Number(p.compareAtPrice.amount) : 0;
      return compare > price;
    });
}

/** Récupère les rayons (collections) de la boutique. */
export async function getCollections(): Promise<Collection[]> {
  const query = /* GraphQL */ `
    query Collections {
      collections(first: 100, sortKey: TITLE) {
        edges {
          node {
            id
            handle
            title
            products(first: 1) {
              edges { node { featuredImage { url(transform: { maxWidth: 300, maxHeight: 300 }) } } }
            }
          }
        }
      }
    }
  `;
  const data = await shopifyRequest<any>(query);
  return data.collections.edges.map((e: any) => ({
    id: e.node.id,
    handle: e.node.handle,
    title: e.node.title,
    thumbnail: e.node.products.edges[0]?.node.featuredImage?.url ?? null,
  }));
}

/** Récupère des produits, éventuellement filtrés par rayon (handle de collection). */
export async function getProducts(collectionHandle?: string): Promise<Product[]> {
  if (collectionHandle) {
    const query = /* GraphQL */ `
      ${PRODUCT_FRAGMENT}
      query CollectionProducts($handle: String!) {
        collection(handle: $handle) {
          products(first: 100) {
            edges { node { ...ProductFields } }
          }
        }
      }
    `;
    const data = await shopifyRequest<any>(query, { handle: collectionHandle });
    if (!data.collection) return [];
    return data.collection.products.edges
      .map((e: any) => flattenProduct(e.node))
      .filter((p: Product) => p.availableForSale); // masque les produits en rupture
  }

  const query = /* GraphQL */ `
    ${PRODUCT_FRAGMENT}
    query AllProducts {
      products(first: 100, sortKey: CREATED_AT, reverse: true) {
        edges { node { ...ProductFields } }
      }
    }
  `;
  const data = await shopifyRequest<any>(query);
  return data.products.edges
    .map((e: any) => flattenProduct(e.node))
    .filter((p: Product) => p.availableForSale); // masque les produits en rupture
}

/** Récupère un produit par son handle, avec toutes ses photos. */
export async function getProductByHandle(handle: string): Promise<Product | null> {
  const query = /* GraphQL */ `
    ${PRODUCT_FRAGMENT}
    query ProductByHandle($handle: String!) {
      product(handle: $handle) {
        ...ProductFields
        images(first: 10) {
          edges {
            node { url(transform: { maxWidth: 900, maxHeight: 900 }) altText }
          }
        }
      }
    }
  `;
  const data = await shopifyRequest<any>(query, { handle });
  return data.product ? flattenProduct(data.product) : null;
}

/** Champs du panier réutilisés. */
const CART_FRAGMENT = /* GraphQL */ `
  fragment CartFields on Cart {
    id
    checkoutUrl
    totalQuantity
    cost { totalAmount { amount currencyCode } }
    lines(first: 50) {
      edges {
        node {
          id
          quantity
          merchandise {
            ... on ProductVariant {
              id
              title
              price { amount currencyCode }
              product { title featuredImage { url altText } }
            }
          }
        }
      }
    }
  }
`;

function flattenCart(node: any): Cart {
  return {
    ...node,
    lines: node.lines.edges.map((e: any) => e.node),
  };
}

/** Crée un nouveau panier avec une première ligne. */
export async function cartCreate(variantId: string, quantity = 1): Promise<Cart> {
  const query = /* GraphQL */ `
    ${CART_FRAGMENT}
    mutation CartCreate($lines: [CartLineInput!]!) {
      cartCreate(input: { lines: $lines }) {
        cart { ...CartFields }
        userErrors { message }
      }
    }
  `;
  const data = await shopifyRequest<any>(query, {
    lines: [{ merchandiseId: variantId, quantity }],
  });
  const { cart, userErrors } = data.cartCreate;
  if (userErrors?.length) throw new Error(userErrors[0].message);
  return flattenCart(cart);
}

/** Ajoute une ligne à un panier existant. */
export async function cartLinesAdd(
  cartId: string,
  variantId: string,
  quantity = 1
): Promise<Cart> {
  const query = /* GraphQL */ `
    ${CART_FRAGMENT}
    mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart { ...CartFields }
        userErrors { message }
      }
    }
  `;
  const data = await shopifyRequest<any>(query, {
    cartId,
    lines: [{ merchandiseId: variantId, quantity }],
  });
  const { cart, userErrors } = data.cartLinesAdd;
  if (userErrors?.length) throw new Error(userErrors[0].message);
  return flattenCart(cart);
}

/** Supprime une ligne du panier. */
export async function cartLinesRemove(cartId: string, lineId: string): Promise<Cart> {
  const query = /* GraphQL */ `
    ${CART_FRAGMENT}
    mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
        cart { ...CartFields }
        userErrors { message }
      }
    }
  `;
  const data = await shopifyRequest<any>(query, { cartId, lineIds: [lineId] });
  const { cart, userErrors } = data.cartLinesRemove;
  if (userErrors?.length) throw new Error(userErrors[0].message);
  return flattenCart(cart);
}

/** Rattache le panier au client connecté (commande liée + checkout pré-rempli). */
export async function cartAttachCustomer(
  cartId: string,
  customerAccessToken: string
): Promise<void> {
  const query = /* GraphQL */ `
    mutation CartBuyer($cartId: ID!, $token: String!) {
      cartBuyerIdentityUpdate(
        cartId: $cartId
        buyerIdentity: { customerAccessToken: $token }
      ) {
        cart { id }
        userErrors { message }
      }
    }
  `;
  await shopifyRequest<any>(query, { cartId, token: customerAccessToken });
}
