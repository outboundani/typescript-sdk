import { describe, expect, it } from "vitest";
import { outboundiq, type OutboundIQ } from "../src/index";
import { fetchStub, jsonResponse } from "./helpers";

const BASE = "https://api.outboundiq.cloud";

interface EndpointCase {
  name: string;
  run: (oiq: OutboundIQ) => Promise<unknown>;
  method: string;
  url: string;
  body?: unknown;
  response?: unknown;
}

const cases: EndpointCase[] = [
  {
    name: "assignment.next",
    run: (oiq) =>
      oiq.assignment.next({
        prospect_phone: "5559876543",
        prospect_zip: "90210",
        dialer_campaign: "camp-1",
        e164: true,
      }),
    method: "POST",
    url: `${BASE}/assignment`,
    body: {
      prospect_phone: "5559876543",
      prospect_zip: "90210",
      dialer_campaign: "camp-1",
      e164: true,
    },
    response: { success: true, ani: "2345678901", message: "ANI assigned successfully" },
  },
  {
    name: "assignment.batch",
    run: (oiq) =>
      oiq.assignment.batch({
        leads: [{ row_id: "lead-1", prospect_phone: "5559876543" }],
        real_time: true,
      }),
    method: "POST",
    url: `${BASE}/assignment/batch`,
    body: {
      leads: [{ row_id: "lead-1", prospect_phone: "5559876543" }],
      real_time: true,
    },
    response: {
      success: true,
      results: [{ row_id: "lead-1", outboundani: "2345678901", error: "" }],
    },
  },
  {
    name: "dials.create",
    run: (oiq) =>
      oiq.dials.create({
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
      }),
    method: "POST",
    url: `${BASE}/dials`,
    response: { message: "dial queued" },
  },
  {
    name: "custom.campaigns.create",
    run: (oiq) =>
      oiq.custom.campaigns.create({ id: "c-1", name: "My Campaign", type: "Outbound" }),
    method: "POST",
    url: `${BASE}/custom/campaigns`,
    body: { id: "c-1", name: "My Campaign", type: "Outbound" },
  },
  {
    name: "custom.campaigns.update",
    run: (oiq) => oiq.custom.campaigns.update({ id: "c-1", name: "Renamed" }),
    method: "PUT",
    url: `${BASE}/custom/campaigns`,
    body: { id: "c-1", name: "Renamed" },
  },
  {
    name: "custom.campaigns.get",
    run: (oiq) => oiq.custom.campaigns.get("c-1"),
    method: "GET",
    url: `${BASE}/custom/campaigns?id=c-1`,
  },
  {
    name: "custom.campaigns.delete",
    run: (oiq) => oiq.custom.campaigns.delete("c-1"),
    method: "DELETE",
    url: `${BASE}/custom/campaigns`,
    body: { id: "c-1" },
  },
  {
    name: "custom.dispos.create",
    run: (oiq) =>
      oiq.custom.dispos.create({
        id: "d-1",
        name: "Sale",
        type: "Agent",
        contact: true,
        success: true,
      }),
    method: "POST",
    url: `${BASE}/custom/dispos`,
    body: { id: "d-1", name: "Sale", type: "Agent", contact: true, success: true },
  },
  {
    name: "custom.dispos.get",
    run: (oiq) => oiq.custom.dispos.get("d-1"),
    method: "GET",
    url: `${BASE}/custom/dispos?id=d-1`,
  },
  {
    name: "custom.dispos.delete",
    run: (oiq) => oiq.custom.dispos.delete("d-1"),
    method: "DELETE",
    url: `${BASE}/custom/dispos`,
    body: { id: "d-1" },
  },
  {
    name: "custom.anis.create",
    run: (oiq) =>
      oiq.custom.anis.create({
        country_code: "+1",
        number: "5551234567",
        inbound_group_id: "ig-1",
        is_branded: true,
        brand_name: "Acme",
      }),
    method: "POST",
    url: `${BASE}/custom/anis`,
    body: {
      country_code: "+1",
      number: "5551234567",
      inbound_group_id: "ig-1",
      is_branded: true,
      brand_name: "Acme",
    },
  },
  {
    name: "custom.anis.get",
    run: (oiq) => oiq.custom.anis.get("5551234567"),
    method: "GET",
    url: `${BASE}/custom/anis?number=5551234567`,
    response: {
      success: true,
      ani: { country_code: "+1", number: "5551234567", inbound_group_id: "ig-1" },
    },
  },
  {
    name: "custom.anis.delete",
    run: (oiq) => oiq.custom.anis.delete("5551234567"),
    method: "DELETE",
    url: `${BASE}/custom/anis`,
    body: { number: "5551234567" },
  },
  {
    name: "nrm.listAnis",
    run: (oiq) => oiq.nrm.listAnis({ page: 1, page_size: 100, number: "555" }),
    method: "GET",
    url: `${BASE}/nrm/anis?page=1&page_size=100&number=555`,
    response: {
      result: "success",
      count: 0,
      total_anis: 0,
      can_next_page: false,
      can_prev_page: false,
      total_pages: 0,
      data: [],
    },
  },
  {
    name: "nrm.remediate",
    run: (oiq) => oiq.nrm.remediate({ ani: "5551234567", carrier: "130077" }),
    method: "POST",
    url: `${BASE}/nrm/remediate`,
    body: { ani: "5551234567", carrier: "130077" },
    response: { status: "received request", ani: "5551234567" },
  },
  {
    name: "nrm.pause",
    run: (oiq) => oiq.nrm.pause({ ani: "5551234567", note: "spam flagged" }),
    method: "POST",
    url: `${BASE}/nrm/pause`,
    body: { ani: "5551234567", note: "spam flagged" },
    response: { status: "paused", ani: "5551234567" },
  },
  {
    name: "nrm.activate",
    run: (oiq) => oiq.nrm.activate({ ani: "5551234567", date: "2026-09-01" }),
    method: "POST",
    url: `${BASE}/nrm/activate`,
    body: { ani: "5551234567", date: "2026-09-01" },
    response: { status: "active", ani: "5551234567" },
  },
  {
    name: "liveFeed.ringcx.upload",
    run: (oiq) =>
      oiq.liveFeed.ringcx.upload({
        campaignId: "rc-1",
        lead: { leadPhone: "5559876543", firstName: "Ada" },
        options: { dialPriority: "IMMEDIATE" },
      }),
    method: "POST",
    url: `${BASE}/live-feed/ringcx`,
    body: {
      campaignId: "rc-1",
      lead: { leadPhone: "5559876543", firstName: "Ada" },
      options: { dialPriority: "IMMEDIATE" },
    },
    response: {
      success: true,
      dialerResponse: {
        message: "ok",
        leadsSupplied: 1,
        leadsAccepted: 1,
        leadsInserted: 1,
        processingResult: "OK",
        processingStatus: "DEFAULT_NOT_A_FAILURE",
      },
    },
  },
];

describe("resource endpoints", () => {
  for (const c of cases) {
    it(`${c.name} sends ${c.method} ${c.url.replace(BASE, "")}`, async () => {
      const { calls, fetchFn } = fetchStub(() =>
        jsonResponse(200, c.response ?? { success: true }),
      );
      const oiq = outboundiq({ apiKey: "k", fetch: fetchFn });
      const result = await c.run(oiq);
      expect(calls.length).toBe(1);
      expect(calls[0]!.method).toBe(c.method);
      expect(calls[0]!.url).toBe(c.url);
      if (c.body !== undefined) {
        expect(JSON.parse(calls[0]!.body!)).toEqual(c.body);
      } else if (c.method === "GET") {
        expect(calls[0]!.body).toBeUndefined();
      }
      if (c.response !== undefined) {
        expect(result).toEqual(c.response);
      }
    });
  }

  it("assignment.next narrows the response on success", async () => {
    const { fetchFn } = fetchStub(() =>
      jsonResponse(200, { success: true, ani: "2345678901", message: "ok" }),
    );
    const oiq = outboundiq({ apiKey: "k", fetch: fetchFn });
    const result = await oiq.assignment.next({ prospect_phone: "5559876543" });
    if (result.success) {
      expect(result.ani).toBe("2345678901");
    } else {
      throw new Error("expected success response");
    }
  });
});
