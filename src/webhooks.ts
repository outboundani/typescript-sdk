import { WebhookVerificationError } from "./core/errors";

/** Header carrying the HMAC signature, in the form "sha256=<hex>". */
export const WEBHOOK_SIGNATURE_HEADER = "x-outboundiq-signature";
/** Header carrying the event type, currently always "dial.batch". */
export const WEBHOOK_EVENT_HEADER = "x-outboundiq-event";
/** Header carrying a unique delivery UUID, useful as an idempotency key. */
export const WEBHOOK_DELIVERY_ID_HEADER = "x-outboundiq-delivery-id";

/** A single dial event inside a dial.batch delivery. */
export interface DialEvent {
  companySlug: string;
  callId: string | null;
  callDirection: string;
  /** ISO 8601 UTC timestamp of the dial. */
  timestamp: string;
  /** Outbound caller ID as a 10 digit US number. */
  ani: string | null;
  /** Prospect or customer number as a 10 digit US number. */
  phone: string | null;
  campaign: string | null;
  campaignInternalId: string | null;
  agent: string | null;
  disposition: string | null;
  dispositionId: string | null;
  contact: boolean;
  success: boolean;
  isSystemDispo: boolean;
  totalDialAttempts: number | null;
}

/**
 * Payload of a dial.batch webhook delivery. Each delivery contains 1 to 100
 * dial events for the same company.
 * https://docs.outboundiq.cloud/reference/webhooks
 */
export interface DialBatchWebhookPayload {
  event: "dial.batch";
  deliveryId: string;
  deliveredAt: string;
  dials: DialEvent[];
}

/**
 * Verify a webhook signature against the raw request body.
 *
 * Pass the raw body exactly as received. Parsing and re-serializing the JSON
 * before verifying will change the bytes and fail the check.
 *
 * @param payload Raw request body as a string or bytes.
 * @param signature Value of the x-outboundiq-signature header, with or without the "sha256=" prefix.
 * @param secret The signing secret shown when the webhook was created in Pulse.
 */
export async function verifyWebhookSignature(
  payload: string | Uint8Array,
  signature: string,
  secret: string,
): Promise<boolean> {
  const hex = signature.startsWith("sha256=")
    ? signature.slice("sha256=".length)
    : signature;
  const signatureBytes = hexToBytes(hex.trim());
  if (!signatureBytes) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  // crypto.subtle.verify performs a constant-time comparison.
  return crypto.subtle.verify("HMAC", key, signatureBytes, toBytes(payload));
}

/**
 * Verify a webhook delivery and parse its payload in one step. Throws
 * WebhookVerificationError when the signature does not match.
 */
export async function constructWebhookEvent(
  payload: string | Uint8Array,
  signature: string,
  secret: string,
): Promise<DialBatchWebhookPayload> {
  const valid = await verifyWebhookSignature(payload, signature, secret);
  if (!valid) {
    throw new WebhookVerificationError(
      "Webhook signature verification failed. Verify against the raw request body and check the signing secret from Pulse.",
    );
  }
  const text =
    typeof payload === "string" ? payload : new TextDecoder().decode(payload);
  return JSON.parse(text) as DialBatchWebhookPayload;
}

function toBytes(payload: string | Uint8Array): BufferSource {
  return typeof payload === "string"
    ? new TextEncoder().encode(payload)
    : (payload as BufferSource);
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> | null {
  if (hex.length === 0 || hex.length % 2 !== 0 || /[^0-9a-fA-F]/.test(hex)) {
    return null;
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
