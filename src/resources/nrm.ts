import type { HttpClient } from "../core/http";

export interface NrmListAnisParams {
  /** 1-based page number. Defaults to 1. */
  page?: number;
  /** Page size, maximum 1000. Defaults to 1000. */
  page_size?: number;
  /** Filter by phone number prefix. */
  number?: string;
}

/**
 * An ANI as returned by the NRM inventory. Field types are inferred from the
 * documentation and preserved loosely until verified against live responses.
 */
export interface NrmAni {
  id: string | number;
  phone: string;
  brand: string | null;
  status: string | number;
  statusLabel: string;
  campaignName: string | null;
  areaCode: string;
  region: string | null;
  state: string | null;
  locality: string | null;
  frequencyAssigned: number;
  frequencyDialed: number;
  frequencyContacted: number;
  dateLastDialed: string | null;
  dateActivated: string | null;
  dateDeactivated: string | null;
  dateInventoried: string | null;
  createdAt: string;
  last30DaysDials: number;
  last30DaysContacts: number;
  contactRate: number;
  successRate: number;
  blockRate: number;
  noAnswerRate: number;
  [key: string]: unknown;
}

export interface NrmListAnisResponse {
  result: string;
  count: number;
  total_anis: number;
  can_next_page: boolean;
  can_prev_page: boolean;
  total_pages: number;
  data: NrmAni[];
  [key: string]: unknown;
}

export interface NrmRemediateRequest {
  ani: string;
  /**
   * Six digit carrier ID. The full carrier list is published at
   * https://docs.outboundiq.cloud/reference/nrm/carriers/
   */
  carrier?: string;
  note?: string;
}

export interface NrmPauseRequest {
  ani: string;
  /** Six digit carrier ID. */
  carrier?: string;
  note?: string;
  date?: string;
}

export interface NrmActivateRequest {
  ani: string;
  date: string;
  /** Six digit carrier ID. */
  carrier?: string;
  note?: string;
}

/**
 * Action responses vary by outcome, for example { status: "paused", ani } on
 * success or { success: false, message } on failure. The remediate endpoint
 * can also return { status: "within cooldown" }.
 */
export interface NrmActionResponse {
  status?: string;
  ani?: string;
  success?: boolean;
  message?: string;
  [key: string]: unknown;
}

/**
 * Number reputation management.
 * https://docs.outboundiq.cloud/reference/nrm/v2
 */
export class NrmResource {
  constructor(private readonly http: HttpClient) {}

  /** List the ANI inventory with reputation and performance stats. GET /nrm/anis */
  listAnis(params: NrmListAnisParams = {}): Promise<NrmListAnisResponse> {
    return this.http.request({
      method: "GET",
      path: "/nrm/anis",
      query: { ...params },
    });
  }

  /** Request remediation for a flagged or blocked ANI. POST /nrm/remediate */
  remediate(request: NrmRemediateRequest): Promise<NrmActionResponse> {
    return this.http.request({
      method: "POST",
      path: "/nrm/remediate",
      body: request,
    });
  }

  /** Put an ANI into a cooling off period. POST /nrm/pause */
  pause(request: NrmPauseRequest): Promise<NrmActionResponse> {
    return this.http.request({
      method: "POST",
      path: "/nrm/pause",
      body: request,
    });
  }

  /** Return a paused ANI to active dialing. POST /nrm/activate */
  activate(request: NrmActivateRequest): Promise<NrmActionResponse> {
    return this.http.request({
      method: "POST",
      path: "/nrm/activate",
      body: request,
    });
  }
}
