import { shopifyRequest } from "./client";
import type { Money } from "./types";

export interface CustomerOrder {
  id: string;
  name: string;
  processedAt: string;
  financialStatus: string | null;
  fulfillmentStatus: string | null;
  total: Money;
  lineItems: { title: string; quantity: number }[];
}

export interface Customer {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  orders: CustomerOrder[];
}

/** Récupère les erreurs Shopify lisibles (email déjà pris, mot de passe trop court…). */
function firstError(errors: any[] | undefined): string | null {
  if (errors && errors.length) return errors[0].message;
  return null;
}

/** Crée un compte client. */
export async function customerCreate(input: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}): Promise<void> {
  const query = /* GraphQL */ `
    mutation CustomerCreate($input: CustomerCreateInput!) {
      customerCreate(input: $input) {
        customer { id }
        customerUserErrors { message }
      }
    }
  `;
  const data = await shopifyRequest<any>(query, { input });
  const err = firstError(data.customerCreate.customerUserErrors);
  if (err) throw new Error(err);
}

/** Connecte un client et renvoie un jeton de session. */
export async function customerLogin(
  email: string,
  password: string
): Promise<{ accessToken: string; expiresAt: string }> {
  const query = /* GraphQL */ `
    mutation Login($input: CustomerAccessTokenCreateInput!) {
      customerAccessTokenCreate(input: $input) {
        customerAccessToken { accessToken expiresAt }
        customerUserErrors { message }
      }
    }
  `;
  const data = await shopifyRequest<any>(query, { input: { email, password } });
  const result = data.customerAccessTokenCreate;
  const err = firstError(result.customerUserErrors);
  if (err) throw new Error(err);
  if (!result.customerAccessToken) {
    throw new Error("Email ou mot de passe incorrect.");
  }
  return result.customerAccessToken;
}

/** Déconnecte (invalide le jeton côté Shopify). */
export async function customerLogout(accessToken: string): Promise<void> {
  const query = /* GraphQL */ `
    mutation Logout($token: String!) {
      customerAccessTokenDelete(customerAccessToken: $token) {
        deletedAccessToken
        userErrors { message }
      }
    }
  `;
  try {
    await shopifyRequest<any>(query, { token: accessToken });
  } catch {
    // Peu importe si l'invalidation distante échoue : on efface le jeton local.
  }
}

/** Récupère le profil et l'historique des commandes du client connecté. */
export async function getCustomer(accessToken: string): Promise<Customer | null> {
  const query = /* GraphQL */ `
    query Customer($token: String!) {
      customer(customerAccessToken: $token) {
        firstName
        lastName
        email
        orders(first: 25, sortKey: PROCESSED_AT, reverse: true) {
          edges {
            node {
              id
              name
              processedAt
              financialStatus
              fulfillmentStatus
              totalPrice { amount currencyCode }
              lineItems(first: 10) {
                edges { node { title quantity } }
              }
            }
          }
        }
      }
    }
  `;
  const data = await shopifyRequest<any>(query, { token: accessToken });
  const c = data.customer;
  if (!c) return null;
  return {
    firstName: c.firstName,
    lastName: c.lastName,
    email: c.email,
    orders: c.orders.edges.map((e: any) => ({
      id: e.node.id,
      name: e.node.name,
      processedAt: e.node.processedAt,
      financialStatus: e.node.financialStatus,
      fulfillmentStatus: e.node.fulfillmentStatus,
      total: e.node.totalPrice,
      lineItems: e.node.lineItems.edges.map((l: any) => l.node),
    })),
  };
}
