import Stripe from "stripe";

let cachedClient: Stripe | null = null;
let cachedAt = 0;
const CACHE_MS = 60_000;

type ReplitConnectionSettings = {
  api_key?: string;
  apiKey?: string;
  secret_key?: string;
  publishable_key?: string;
  webhook_signing_secret?: string;
};

type ReplitConnectionResponse = {
  items?: Array<{
    connector_name?: string;
    connectorName?: string;
    settings?: ReplitConnectionSettings;
  } & ReplitConnectionSettings>;
};

async function fetchReplitStripeCreds(): Promise<ReplitConnectionSettings | null> {
  const host = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const token =
    process.env.REPL_IDENTITY ||
    process.env.WEB_REPL_RENEWAL ||
    process.env.REPLIT_IDENTITY;
  if (!host || !token) return null;

  try {
    const url = `https://${host}/api/v2/connection?include_secrets=true&connector_names=stripe`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-Replit-Token": token,
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as ReplitConnectionResponse;
    const items = data.items ?? [];
    const stripeConn = items.find(
      (i) => (i.connector_name || i.connectorName) === "stripe",
    );
    if (!stripeConn) return null;
    return (stripeConn.settings ?? stripeConn) as ReplitConnectionSettings;
  } catch {
    return null;
  }
}

/**
 * Returns a Stripe client using credentials from either:
 *   1. The Replit Stripe connector (preferred), or
 *   2. The STRIPE_SECRET_KEY env var fallback.
 *
 * Tokens are short-lived — never cache the returned client beyond CACHE_MS.
 */
export async function getUncachableStripeClient(): Promise<Stripe | null> {
  const now = Date.now();
  if (cachedClient && now - cachedAt < CACHE_MS) return cachedClient;

  const settings = await fetchReplitStripeCreds();
  const key =
    settings?.secret_key ??
    settings?.api_key ??
    settings?.apiKey ??
    process.env.STRIPE_SECRET_KEY;
  if (!key) return null;

  // Use Stripe SDK's pinned default API version (no override needed).
  cachedClient = new Stripe(key);
  cachedAt = now;
  return cachedClient;
}

export async function getStripePublishableKey(): Promise<string | null> {
  const settings = await fetchReplitStripeCreds();
  return (
    settings?.publishable_key ??
    process.env.STRIPE_PUBLISHABLE_KEY ??
    null
  );
}

export async function getStripeWebhookSecret(): Promise<string | null> {
  const settings = await fetchReplitStripeCreds();
  return (
    settings?.webhook_signing_secret ??
    process.env.STRIPE_WEBHOOK_SECRET ??
    null
  );
}
