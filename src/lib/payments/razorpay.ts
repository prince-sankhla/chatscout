const API_BASE = 'https://api.razorpay.com';

function credentials() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) throw new Error('Razorpay test credentials are not configured.');
  return { keyId, keySecret };
}

export function isRazorpayTestMode() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim() ?? '';
  return keyId.startsWith('rzp_test_');
}

async function razorpayFetch(path: string, init: RequestInit = {}) {
  const { keyId, keySecret } = credentials();
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      authorization: `Basic ${auth}`,
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });
  const text = await response.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!response.ok) {
    const message = typeof data === 'object' && data && 'error' in data ? JSON.stringify((data as Record<string, unknown>).error) : `Razorpay request failed (${response.status})`;
    throw new Error(message);
  }
  return data as Record<string, unknown>;
}

export async function createLinkedAccount(input: { email: string; name: string; phone?: string | null }) {
  if (!isRazorpayTestMode()) throw new Error('Vynlo payouts are locked to Razorpay Test Mode until production approval.');
  return razorpayFetch('/v2/accounts', {
    method: 'POST',
    body: JSON.stringify({ email: input.email, business_name: input.name, business_type: 'individual', contact_name: input.name, ...(input.phone ? { contact_mobile: input.phone } : {}) }),
  });
}

export async function createRouteStakeholder(accountId: string, input: { name: string; email: string; phone?: string | null }) {
  if (!isRazorpayTestMode()) throw new Error('Vynlo payouts are locked to Razorpay Test Mode until production approval.');
  return razorpayFetch(`/v2/accounts/${encodeURIComponent(accountId)}/stakeholders`, {
    method: 'POST',
    body: JSON.stringify({ name: input.name, email: input.email, percentage_ownership: 100, relationship: { phone: input.phone ?? '' }, notes: { source: 'vynlo' } }),
  });
}

export async function requestRouteProduct(accountId: string) {
  if (!isRazorpayTestMode()) throw new Error('Vynlo payouts are locked to Razorpay Test Mode until production approval.');
  return razorpayFetch(`/v2/accounts/${encodeURIComponent(accountId)}/products`, {
    method: 'POST',
    body: JSON.stringify({ product_name: 'route', tnc_accepted: true }),
  });
}

export async function fetchLinkedAccount(accountId: string) {
  return razorpayFetch(`/v2/accounts/${encodeURIComponent(accountId)}`);
}

export async function createTransfer(paymentId: string, accountId: string, amountInInr: number, notes: Record<string, string> = {}) {
  if (!isRazorpayTestMode()) throw new Error('Vynlo payouts are locked to Razorpay Test Mode until production approval.');
  return razorpayFetch(`/v1/payments/${encodeURIComponent(paymentId)}/transfers`, {
    method: 'POST',
    body: JSON.stringify({ transfers: [{ account: accountId, amount: Math.round(amountInInr * 100), currency: 'INR', notes }] }),
  });
}

export async function fetchPayment(paymentId: string) {
  return razorpayFetch(`/v1/payments/${encodeURIComponent(paymentId)}`);
}
