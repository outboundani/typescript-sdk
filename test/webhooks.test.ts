import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  WebhookVerificationError,
  constructWebhookEvent,
  verifyWebhookSignature,
  type DialBatchWebhookPayload,
} from "../src/index";

const SECRET = "whsec_test_secret";

const payload: DialBatchWebhookPayload = {
  event: "dial.batch",
  deliveryId: "3f6d1c1e-9d1f-4a5b-8f3a-1c2d3e4f5a6b",
  deliveredAt: "2026-08-18T18:00:00Z",
  dials: [
    {
      companySlug: "acme",
      callId: "call-1",
      callDirection: "Outbound",
      timestamp: "2026-08-18T17:59:58Z",
      ani: "2345678901",
      phone: "5559876543",
      campaign: "Q3 Push",
      campaignInternalId: "c-9",
      agent: "Jane Doe",
      disposition: "Sale",
      dispositionId: "d-1",
      contact: true,
      success: true,
      isSystemDispo: false,
      totalDialAttempts: 3,
    },
  ],
};

const rawBody = JSON.stringify(payload);
const validHex = createHmac("sha256", SECRET).update(rawBody).digest("hex");

describe("verifyWebhookSignature", () => {
  it("accepts a valid signature with the sha256= prefix", async () => {
    await expect(
      verifyWebhookSignature(rawBody, `sha256=${validHex}`, SECRET),
    ).resolves.toBe(true);
  });

  it("accepts a valid signature without the prefix", async () => {
    await expect(
      verifyWebhookSignature(rawBody, validHex, SECRET),
    ).resolves.toBe(true);
  });

  it("accepts the raw body as bytes", async () => {
    await expect(
      verifyWebhookSignature(
        new TextEncoder().encode(rawBody),
        `sha256=${validHex}`,
        SECRET,
      ),
    ).resolves.toBe(true);
  });

  it("rejects a tampered payload", async () => {
    const tampered = rawBody.replace("Sale", "No Sale");
    await expect(
      verifyWebhookSignature(tampered, `sha256=${validHex}`, SECRET),
    ).resolves.toBe(false);
  });

  it("rejects a signature made with the wrong secret", async () => {
    const wrong = createHmac("sha256", "other").update(rawBody).digest("hex");
    await expect(
      verifyWebhookSignature(rawBody, `sha256=${wrong}`, SECRET),
    ).resolves.toBe(false);
  });

  it("rejects malformed signatures without throwing", async () => {
    await expect(
      verifyWebhookSignature(rawBody, "sha256=nothex!", SECRET),
    ).resolves.toBe(false);
    await expect(verifyWebhookSignature(rawBody, "", SECRET)).resolves.toBe(
      false,
    );
    await expect(
      verifyWebhookSignature(rawBody, "sha256=abc", SECRET),
    ).resolves.toBe(false);
  });
});

describe("constructWebhookEvent", () => {
  it("verifies and parses the delivery", async () => {
    const event = await constructWebhookEvent(
      rawBody,
      `sha256=${validHex}`,
      SECRET,
    );
    expect(event.event).toBe("dial.batch");
    expect(event.dials.length).toBe(1);
    expect(event.dials[0]!.ani).toBe("2345678901");
  });

  it("throws WebhookVerificationError on a bad signature", async () => {
    await expect(
      constructWebhookEvent(rawBody, "sha256=deadbeef", SECRET),
    ).rejects.toBeInstanceOf(WebhookVerificationError);
  });
});
