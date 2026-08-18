import type { HttpClient } from "../core/http";

/** Request body for POST /assignment. */
export interface AssignmentRequest {
  /** Prospect phone number, 10 to 15 digits. */
  prospect_phone: string;
  /** US zip code used for geographic matching. */
  prospect_zip?: string;
  /** Campaign identifier. Optional when a default campaign is configured for the key. */
  dialer_campaign?: string;
  /** Set true for real-time and interactive flows. */
  real_time?: boolean;
  /** Return the ANI in E.164 format. Defaults to false. */
  e164?: boolean;
}

export type AssignmentResponse =
  | { success: true; ani: string; message: string }
  | { success: false; message: string };

export interface AssignmentBatchLead {
  /** Caller-supplied row identifier, echoed back in the matching result. */
  row_id: string;
  /** Prospect phone number, 10 to 15 digits. */
  prospect_phone: string;
  /** US zip code used for geographic matching. */
  prospect_zip?: string;
  /** Campaign identifier. Optional when a default campaign is configured for the key. */
  dialer_campaign?: string;
}

/** Request body for POST /assignment/batch. */
export interface AssignmentBatchRequest {
  leads: AssignmentBatchLead[];
  /** Set true for real-time and interactive flows. */
  real_time?: boolean;
  /** Return all ANIs in E.164 format. Defaults to false. */
  e164?: boolean;
}

export interface AssignmentBatchResult {
  row_id: string;
  /** Assigned ANI, or an empty string when assignment failed for this lead. */
  outboundani: string;
  /** Empty string on success, otherwise the failure reason. */
  error: string;
}

export interface AssignmentBatchResponse {
  success: boolean;
  results: AssignmentBatchResult[];
}

/**
 * ANI assignment.
 * https://docs.outboundiq.cloud/reference/assignment
 */
export class AssignmentResource {
  constructor(private readonly http: HttpClient) {}

  /** Get the next ANI for a single prospect. POST /assignment */
  next(request: AssignmentRequest): Promise<AssignmentResponse> {
    return this.http.request({
      method: "POST",
      path: "/assignment",
      body: request,
    });
  }

  /** Get ANIs for a list of leads in one call. POST /assignment/batch */
  batch(request: AssignmentBatchRequest): Promise<AssignmentBatchResponse> {
    return this.http.request({
      method: "POST",
      path: "/assignment/batch",
      body: request,
    });
  }
}
