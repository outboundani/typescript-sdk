import { HttpClient, type OutboundIQConfig } from "./core/http";
import { AssignmentResource } from "./resources/assignment";
import { CustomDialerResource } from "./resources/custom";
import { DialsResource } from "./resources/dials";
import { LiveFeedResource } from "./resources/liveFeed";
import { NrmResource } from "./resources/nrm";

/**
 * Client for the outboundIQ platform APIs.
 * https://docs.outboundiq.cloud
 */
export class OutboundIQ {
  /** ANI assignment: get the next number to dial from. */
  readonly assignment: AssignmentResource;
  /** Dial ingestion: post dial records for processing and enrichment. */
  readonly dials: DialsResource;
  /** Custom dialer integration: sync campaigns, dispositions, and ANIs. */
  readonly custom: CustomDialerResource;
  /** Number reputation management. */
  readonly nrm: NrmResource;
  /** Live lead feeds into supported dialers. */
  readonly liveFeed: LiveFeedResource;

  constructor(config: OutboundIQConfig = {}) {
    const http = new HttpClient(config);
    this.assignment = new AssignmentResource(http);
    this.dials = new DialsResource(http);
    this.custom = new CustomDialerResource(http);
    this.nrm = new NrmResource(http);
    this.liveFeed = new LiveFeedResource(http);
  }
}

/**
 * Create an outboundIQ client.
 *
 * @example
 * import { outboundiq } from "@outboundiq/client";
 *
 * const oiq = outboundiq({ apiKey: process.env.OUTBOUNDIQ_API_KEY });
 * const result = await oiq.assignment.next({ prospect_phone: "5559876543" });
 */
export function outboundiq(config: OutboundIQConfig = {}): OutboundIQ {
  return new OutboundIQ(config);
}
