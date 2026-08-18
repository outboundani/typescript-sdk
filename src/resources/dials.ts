import type { HttpClient } from "../core/http";

/**
 * Documented call directions. Other string values are accepted in case the
 * platform adds directions before the SDK does.
 */
export type CallDirection =
  | "Inbound"
  | "Outbound"
  | "SMS"
  | "Preview"
  | "Transfer"
  | "Manual"
  | (string & {});

/**
 * A single dial record for POST /dials.
 * For outbound calls, from_number is the caller ID and to_number is the
 * prospect. For inbound calls the two are reversed.
 */
export interface DialRecord {
  campaign_id: string;
  campaign_name: string;
  agent_name: string;
  /** Caller ID on outbound calls, prospect number on inbound calls. */
  from_number: string;
  /** Prospect number on outbound calls, caller ID on inbound calls. */
  to_number: string;
  disposition_name: string;
  /** "YYYY-MM-DD HH:MM:SS" or an ISO 8601 timestamp. */
  datetime: string;
  call_direction: CallDirection;
  /** Prospect zip code. Five digits preferred. */
  zip: string;
  /** Date the lead was originally created, "YYYY-MM-DD". */
  sys_created_date_original: string;
  total_dial_attempts: number | string;
  skill_name: string;
  lead_source: string;
  /** Optional unique identifier for this dial, useful for deduplication. */
  dial_id?: string;
}

export interface DialQueuedResponse {
  message: string;
}

/**
 * Dial ingestion.
 * https://docs.outboundiq.cloud/reference/dials
 */
export class DialsResource {
  constructor(private readonly http: HttpClient) {}

  /** Post one dial record for processing and enrichment. POST /dials */
  create(dial: DialRecord): Promise<DialQueuedResponse> {
    return this.http.request({
      method: "POST",
      path: "/dials",
      body: dial,
    });
  }
}
