import React, { createContext, useContext, useMemo, useState } from "react";
import { cartCreate, cartLinesAdd, cartLinesRemove } from "../shopify/queries";
import type { Cart } from "../shopify/types";

interface CartContextValue {
  cart: Cart | null;
  loading: boolean;
  /** Ajoute une variante au panier (le crée s'il n'existe pas encore). */
  addToCart: (variantId: string, quantity?: number) => Promise<void>;
  removeLine: (lineId: string) => Promise<void>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);

  async function addToCart(variantId: string, quantity = 1) {
    setLoading(true);
    try {
      const updated = cart
        ? await cartLinesAdd(cart.id, variantId, quantity)
        : await cartCreate(variantId, quantity);
      setCart(updated);
    } finally {
      setLoading(false);
    }
  }

  async function removeLine(lineId: string) {
    if (!cart) return;
    setLoading(true);
    try {
      setCart(await cartLinesRemove(cart.id, lineId));
    } finally {
      setLoading(false);
    }
  }

  const value = useMemo(
    () => ({ cart, loading, addToCart, removeLine }),
    [cart, loading]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart doit être utilisé dans un <CartProvider>");
  return ctx;
}
