import type { HttpClient } from "../core/http";

export interface RingCxLead {
  leadPhone: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  zip?: string;
  city?: string;
  address1?: string;
  address2?: string;
  state?: string;
  auxData1?: string;
  auxData2?: string;
  auxData3?: string;
  auxData4?: string;
  auxData5?: string;
}

export interface RingCxUploadOptions {
  dialPriority?: "IMMEDIATE" | "FIRST_PASS" | "SECOND_PASS" | "THIRD_PASS";
  duplicateHandling?: "REMOVE_FROM_LIST" | "RETAIN_ALL" | "REMOVE_ALL_EXISTING";
  listState?: "ACTIVE" | "INACTIVE";
  timeZoneOption?: "NOT_APPLICABLE" | "NPA_NXX" | "ZIPCODE" | "EXPLICIT";
  description?: string;
}

export interface RingCxUploadRequest {
  campaignId: string;
  lead: RingCxLead;
  options?: RingCxUploadOptions;
}

export interface RingCxUploadResponse {
  success: boolean;
  dialerResponse: {
    message: string;
    leadsSupplied: number;
    leadsAccepted: number;
    leadsInserted: number;
    processingResult: string;
    processingStatus: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export class RingCxLiveFeed {
  constructor(private readonly http: HttpClient) {}

  /** Push a single lead into a running RingCX campaign. POST /live-feed/ringcx */
  upload(request: RingCxUploadRequest): Promise<RingCxUploadResponse> {
    return this.http.request({
      method: "POST",
      path: "/live-feed/ringcx",
      body: request,
    });
  }
}

/**
 * Live lead feeds into supported dialers.
 * https://docs.outboundiq.cloud/reference/live-feed/ringcx
 */
export class LiveFeedResource {
  readonly ringcx: RingCxLiveFeed;

  constructor(http: HttpClient) {
    this.ringcx = new RingCxLiveFeed(http);
  }
}
