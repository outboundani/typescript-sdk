# @outboundiq/client

The official TypeScript SDK for the [outboundIQ](https://outboundiq.com) platform.

[![npm version](https://img.shields.io/npm/v/%40outboundiq%2Fclient)](https://www.npmjs.com/package/@outboundiq/client)
[![CI](https://github.com/outboundani/typescript-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/outboundani/typescript-sdk/actions/workflows/ci.yml)

- Typed coverage of the platform APIs: Assignment, Dials, Custom Dialer Integration, ANI Planner, NRM, and Live Feed
- Webhook signature verification with typed `dial.batch` payloads
- Zero runtime dependencies
- Works in Node 20+, Cloudflare Workers, Deno, and Bun
- Automatic retries with exponential backoff, safe by default

The [API reference](https://docs.outboundiq.cloud) remains the source of truth. Request and response fields in this SDK mirror the HTTP API exactly, so anything you read in the docs maps 1:1 to the types here.

## Install

```
npm install @outboundiq/client
```

## Quick start

```ts
import { outboundiq } from "@outboundiq/client";

const oiq = outboundiq({ apiKey: process.env.OUTBOUNDIQ_API_KEY });

const result = await oiq.assignment.next({
  prospect_phone: "5559876543",
  prospect_zip: "90210",
});

if (result.success) {
  console.log(`Dial from ${result.ani}`);
}
```

## Authentication

Every request needs a `universal` API key, generated in the outboundIQ workspace dashboard. Pass it explicitly or set the `OUTBOUNDIQ_API_KEY` environment variable:

```ts
const oiq = outboundiq({ apiKey: "oiq_..." });
// or, with OUTBOUNDIQ_API_KEY set in the environment:
const oiq = outboundiq();
```

Keep the key server-side. Do not ship it in browser bundles.

## Assignment API

Get the next ANI to dial from, one prospect at a time or in batch.

```ts
// Single prospect
const next = await oiq.assignment.next({
  prospect_phone: "5559876543",
  prospect_zip: "90210",
  dialer_campaign: "q3-outbound",
  e164: true,
});

// Batch, one call for a whole lead list
const batch = await oiq.assignment.batch({
  leads: [
    { row_id: "lead-1", prospect_phone: "5559876543", prospect_zip: "90210" },
    { row_id: "lead-2", prospect_phone: "5551112222" },
  ],
});

for (const row of batch.results) {
  if (row.error) console.warn(`${row.row_id}: ${row.error}`);
  else console.log(`${row.row_id} -> ${row.outboundani}`);
}
```

## Dials API

Post dial records for processing and enrichment.

```ts
await oiq.dials.create({
  campaign_id: "abc-123",
  campaign_name: "Q2 Outbound Push",
  agent_name: "Jane Doe",
  from_number: "5551234567",
  to_number: "5559876543",
  disposition_name: "Sale",
  datetime: "2026-04-10 14:32:15",
  call_direction: "Outbound",
  zip: "90210",
  sys_created_date_original: "2026-04-01",
  total_dial_attempts: 3,
  skill_name: "Sales Tier 1",
  lead_source: "facebook-ads",
  dial_id: "550e8400-e29b-41d4-a716-446655440000",
});
```

For outbound calls `from_number` is the caller ID and `to_number` is the prospect. For inbound calls the two are reversed.

## Custom Dialer Integration API

Sync campaigns, dispositions, and ANIs from any dialer into outboundIQ.

```ts
await oiq.custom.campaigns.create({
  id: "c-1",
  name: "My Campaign",
  type: "Outbound",
});
await oiq.custom.campaigns.update({ id: "c-1", name: "Renamed" });
await oiq.custom.campaigns.get("c-1");
await oiq.custom.campaigns.delete("c-1");

await oiq.custom.dispos.create({
  id: "d-1",
  name: "Sale",
  type: "Agent",
  contact: true,
  success: true,
});

await oiq.custom.anis.create({
  country_code: "+1",
  number: "5551234567",
  inbound_group_id: "ig-1",
});
const { ani } = await oiq.custom.anis.get("5551234567");
```

## ANI Planner API

Analyze recent dial volume against your current ANI inventory and get a recommended number of ANIs per region.

```ts
const plan = await oiq.aniPlanner.generate({
  dateStart: "2026-05-01",
  dateEnd: "2026-05-28",
  dailyDialsTarget: "BETTER", // 50 (BEST), 75 (BETTER), or 100 (GOOD) dials per ANI per day
  groupBy: "area_code",
  inventoryMode: "managed",
  campaigns: ["west-coast-outbound"],
});

if (plan.success) {
  const { regionStats, totalCurrentAnis, totalProposedAnis } = plan.data;
  console.log(`${totalCurrentAnis} ANIs today, ${totalProposedAnis} recommended`);

  for (const region of regionStats) {
    if (region.difference > 0) {
      console.log(`${region.region}, ${region.state}: add ${region.difference}`);
    }
  }
}
```

Every field is optional; calling `generate()` with no arguments analyzes the start of the current month through yesterday, across every campaign. The date range defaults, the resolved numeric `dailyDialsTarget`, and the effective range are all echoed back in `data`.

Regions averaging fewer than 20 dials per business day come back with `belowThreshold: true`, are recommended 0 ANIs, and are excluded from `totalProposedAnis` — so any numbers already provisioned there surface as surplus in `aniDifference`.

The shape of `regionStats` follows the company's country, which is detected from the dialer. US and CA group into state/region rows with toll-free reported as a `state: "TF"` row; UK groups per area code and returns a non-zero `tollFreeRecommendation` plus a `"Mobile"` row for 07x volume.

## NRM API

Number reputation management: inventory, remediation, pausing, and activation.

```ts
// Page through the ANI inventory with reputation stats
const inventory = await oiq.nrm.listAnis({ page: 1, page_size: 500 });
for (const ani of inventory.data) {
  console.log(ani.phone, ani.statusLabel, ani.blockRate);
}

// Request remediation for a flagged number
await oiq.nrm.remediate({ ani: "5551234567", carrier: "130077", note: "flagged as spam" });

// Rest a number, then bring it back
await oiq.nrm.pause({ ani: "5551234567" });
await oiq.nrm.activate({ ani: "5551234567", date: "2026-09-01" });
```

Carrier IDs for `remediate` and `pause` are listed in the [carriers reference](https://docs.outboundiq.cloud/reference/nrm/carriers/).

## Live Feed

Push leads into a running dialer campaign in real time. RingCX is supported today.

```ts
await oiq.liveFeed.ringcx.upload({
  campaignId: "rc-1",
  lead: { leadPhone: "5559876543", firstName: "Ada", zip: "90210" },
  options: { dialPriority: "IMMEDIATE", duplicateHandling: "REMOVE_FROM_LIST" },
});
```

## Webhooks

outboundIQ signs every webhook delivery with HMAC-SHA256. Always verify against the raw request body, before any JSON parsing.

```ts
import { constructWebhookEvent, WEBHOOK_SIGNATURE_HEADER } from "@outboundiq/client";
```

Node with Express:

```ts
import express from "express";

const app = express();

app.post(
  "/webhooks/outboundiq",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const event = await constructWebhookEvent(
        req.body,
        req.get(WEBHOOK_SIGNATURE_HEADER) ?? "",
        process.env.OUTBOUNDIQ_WEBHOOK_SECRET!,
      );
      for (const dial of event.dials) {
        console.log(dial.campaign, dial.disposition, dial.success);
      }
      res.sendStatus(200);
    } catch {
      res.sendStatus(400);
    }
  },
);
```

Cloudflare Workers:

```ts
import { constructWebhookEvent } from "@outboundiq/client";

export default {
  async fetch(request: Request, env: { OUTBOUNDIQ_WEBHOOK_SECRET: string }) {
    const body = await request.text();
    const signature = request.headers.get("x-outboundiq-signature") ?? "";
    try {
      const event = await constructWebhookEvent(body, signature, env.OUTBOUNDIQ_WEBHOOK_SECRET);
      // handle event.dials
      return new Response("ok");
    } catch {
      return new Response("bad signature", { status: 400 });
    }
  },
};
```

Notes:

- Deliveries are batched: each `dial.batch` payload carries 1 to 100 dial events.
- Use the `x-outboundiq-delivery-id` header as an idempotency key. Failed deliveries are retried once; reconcile longer gaps via the Dials API.
- `verifyWebhookSignature(payload, signature, secret)` is also exported if you only want the boolean check.

## Error handling

All errors extend `OutboundIQError`. Non-2xx responses carry `status` and the parsed `body`.

```ts
import { AuthenticationError, RateLimitError, OutboundIQError } from "@outboundiq/client";

try {
  await oiq.dials.create(dial);
} catch (error) {
  if (error instanceof AuthenticationError) {
    // 401 or 403: bad, inactive, or wrong-type API key
  } else if (error instanceof RateLimitError) {
    console.log(`retry after ${error.retryAfter ?? "?"}s`);
  } else if (error instanceof OutboundIQError) {
    console.error(error.status, error.body);
  }
}
```

| Error | Meaning |
| --- | --- |
| `AuthenticationError` | 401 or 403. Check that the key is valid, active, and of type `universal`. |
| `RateLimitError` | 429, after retries were exhausted. `retryAfter` is set when the API sent it. |
| `APIError` | Any other non-2xx response. |
| `ConnectionError` | Network failure or timeout. No response was received. |
| `WebhookVerificationError` | A webhook signature did not match the payload. |

## Retries and timeouts

The client retries with exponential backoff and jitter, up to `maxRetries` times (default 2):

- GET requests retry on network errors, 429, and 5xx responses.
- POST, PUT, and DELETE retry only on 429, where the request is known not to have been processed. This avoids duplicating writes like dial records when the outcome of a failed request is unknown.

Set `maxRetries: 0` to disable retries. Every request times out after `timeoutMs` (default 30000) and surfaces as a `ConnectionError`.

## Configuration

```ts
const oiq = outboundiq({
  apiKey: "oiq_...",        // or OUTBOUNDIQ_API_KEY env var
  baseUrl: "https://api.outboundiq.cloud",
  timeoutMs: 30_000,
  maxRetries: 2,
  fetch: customFetch,        // bring your own fetch if you need to
});
```

## Requirements

Node 20 or newer, or any runtime with the fetch and Web Crypto APIs (Cloudflare Workers, Deno, Bun).

## License

MIT
