import { supabase } from "./supabase";

/** Suivi de commande — via les fonctions Lovable Cloud get-customer-orders / get-order-status. */

export interface OrderLineItem {
  name: string;
  quantity: number;
  price: string | number | null;
}
export interface OrderTracking {
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
}
export interface CustomerOrder {
  orderName: string;
  financialStatus: string | null;
  fulfillmentStatus: string | null;
  total: string | number | null;
  currency: string;
  date: string | null;
  lineItems: OrderLineItem[];
  tracking: OrderTracking[];
  statusUrl?: string | null;
}

function pick<T = any>(o: any, ...keys: string[]): T | undefined {
  for (const k of keys) if (o && o[k] != null) return o[k];
  return undefined;
}

/** Normalise un objet commande renvoyé par Shopify/Lovable (noms variables). */
export function normalizeOrder(o: any): CustomerOrder {
  const items = pick<any[]>(o, "line_items", "lineItems") ?? [];
  const rawTracking =
    pick<any[]>(o, "tracking", "fulfillments", "trackings", "tracking_info") ?? [];
  const trackingArr = Array.isArray(rawTracking) ? rawTracking : [rawTracking];
  return {
    orderName:
      pick(o, "order_name", "orderName", "name") ??
      (pick(o, "orderNumber", "order_number") ? `#${pick(o, "orderNumber", "order_number")}` : "Commande"),
    financialStatus: pick(o, "financialStatus", "financial_status") ?? null,
    fulfillmentStatus: pick(o, "fulfillmentStatus", "fulfillment_status") ?? null,
    total: pick(o, "total_price", "totalPrice", "total") ?? null,
    currency: pick(o, "currency", "currency_code", "currencyCode") ?? "EUR",
    date: pick(o, "processedAt", "processed_at", "created_at", "createdAt") ?? null,
    lineItems: (items || []).map((li: any) => ({
      name: pick(li, "name", "title") ?? "Article",
      quantity: pick(li, "quantity", "qty") ?? 1,
      price: pick(li, "price", "unit_price") ?? null,
    })),
    tracking: (trackingArr || [])
      .filter(Boolean)
      .map((t: any) => ({
        carrier: pick(t, "carrier", "tracking_company", "trackingCompany"),
        trackingNumber: pick(t, "trackingNumber", "tracking_number"),
        trackingUrl: pick(t, "trackingUrl", "tracking_url"),
      }))
      .filter((t: OrderTracking) => t.carrier || t.trackingNumber || t.trackingUrl),
    statusUrl: pick(o, "statusUrl", "status_url", "order_status_url") ?? null,
  };
}

/** Commandes du client connecté (par son email). */
export async function getCustomerOrders(email: string): Promise<CustomerOrder[]> {
  const { data, error } = await supabase.functions.invoke("get-customer-orders", {
    body: { email },
  });
  if (error) throw new Error(error.message || "Impossible de récupérer les commandes.");
  const list = Array.isArray(data) ? data : data?.orders ?? data?.data ?? [];
  return (list as any[]).map(normalizeOrder);
}

/** Commandes récupérées par numéro/nom de commande. */
export async function getCustomerOrdersByName(orderName: string): Promise<CustomerOrder[]> {
  const { data, error } = await supabase.functions.invoke("get-customer-orders", {
    body: { orderName },
  });
  if (error) return [];
  const list = Array.isArray(data) ? data : data?.orders ?? data?.data ?? [];
  return (list as any[]).map(normalizeOrder);
}

/** Commande minimale (repli si on ne récupère que le numéro). */
export function minimalOrder(orderName: string): CustomerOrder {
  return {
    orderName,
    financialStatus: null,
    fulfillmentStatus: null,
    total: null,
    currency: "EUR",
    date: null,
    lineItems: [],
    tracking: [],
    statusUrl: null,
  };
}

/**
 * Toutes les commandes du client : celles de l'email du compte + celles
 * rattachées (linked_orders), souvent passées avec un autre email.
 */
export async function getAllMyOrders(
  userEmail: string | undefined,
  linked: { order_name: string | null; order_email: string | null }[]
): Promise<CustomerOrder[]> {
  const byName = new Map<string, CustomerOrder>();
  const add = (list: CustomerOrder[]) =>
    list.forEach((o) => {
      if (!byName.has(o.orderName)) byName.set(o.orderName, o);
    });

  if (userEmail) add(await getCustomerOrders(userEmail).catch(() => []));

  for (const lo of linked) {
    let fetched: CustomerOrder[] = [];
    if (lo.order_email && lo.order_email !== userEmail) {
      fetched = await getCustomerOrders(lo.order_email).catch(() => []);
    }
    if (!fetched.length && lo.order_name) {
      fetched = await getCustomerOrdersByName(lo.order_name).catch(() => []);
    }
    if (fetched.length) add(fetched);
    else if (lo.order_name && !byName.has(lo.order_name)) {
      byName.set(lo.order_name, minimalOrder(lo.order_name));
    }
  }

  return Array.from(byName.values());
}

/** Suivi d'une commande par son numéro + un contact (email ou téléphone). */
export async function getOrderStatus(
  orderNumber: string,
  contactInfo: string
): Promise<CustomerOrder> {
  const { data, error } = await supabase.functions.invoke("get-order-status", {
    body: { orderNumber, contactInfo },
  });
  if (error) throw new Error(error.message || "Commande introuvable.");
  const order = data?.order ?? data;
  if (!order) throw new Error("Commande introuvable. Vérifie le numéro et le contact.");
  return normalizeOrder(order);
}

/** Rattache une commande au compte (best-effort). */
export async function linkOrder(orderName: string, contactInfo: string): Promise<void> {
  const { error } = await supabase.functions.invoke("link-order", {
    body: { orderName, orderNumber: orderName.replace("#", ""), contactInfo },
  });
  if (error) throw new Error(error.message || "Rattachement impossible.");
}

/* ----------------------------- Libellés FR -------------------------------- */

export function fulfillmentLabel(status: string | null): { label: string; step: number } {
  switch ((status || "").toLowerCase()) {
    case "fulfilled":
      return { label: "Expédiée", step: 4 };
    case "partial":
    case "partially_fulfilled":
      return { label: "Partiellement expédiée", step: 3 };
    case "in_transit":
      return { label: "En transit", step: 4 };
    case "delivered":
      return { label: "Livrée", step: 5 };
    case "restocked":
    case "cancelled":
      return { label: "Annulée", step: 0 };
    default:
      return { label: "En préparation", step: 2 };
  }
}

export function financialLabel(status: string | null): string {
  switch ((status || "").toLowerCase()) {
    case "paid":
      return "Payée";
    case "pending":
      return "Paiement en attente";
    case "partially_refunded":
      return "Partiellement remboursée";
    case "refunded":
      return "Remboursée";
    case "voided":
      return "Annulée";
    default:
      return status || "—";
  }
}
