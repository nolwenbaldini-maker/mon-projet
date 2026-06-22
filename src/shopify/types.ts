/** Types simplifiés des objets Shopify utilisés dans l'app. */

export interface Money {
  amount: string;
  currencyCode: string;
}

export interface ProductImage {
  url: string;
  altText: string | null;
}

export interface ProductVariant {
  id: string;
  title: string;
  availableForSale: boolean;
  price: Money;
}

export interface Product {
  id: string;
  handle: string;
  title: string;
  description: string;
  availableForSale: boolean;
  featuredImage: ProductImage | null;
  priceRange: { minVariantPrice: Money };
  variants: ProductVariant[];
}

export interface Collection {
  id: string;
  handle: string;
  title: string;
  /** Vignette (image du premier produit de la rubrique), si disponible. */
  thumbnail: string | null;
}

export interface CartLine {
  id: string;
  quantity: number;
  merchandise: {
    id: string;
    title: string;
    price: Money;
    product: { title: string; featuredImage: ProductImage | null };
  };
}

export interface Cart {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: { totalAmount: Money };
  lines: CartLine[];
}
