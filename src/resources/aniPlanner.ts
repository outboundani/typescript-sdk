import type { HttpClient } from "../core/http";

/**
 * Target maximum dials per ANI per day.
 * "BEST" is 50 dials/day, "BETTER" is 75, "GOOD" is 100.
 */
export type AniPlannerDailyDialsTarget = "BEST" | "BETTER" | "GOOD";

/**
 * How dial volume is grouped into regions.
 * "area_code" uses the prospect's phone area code, "ani" the area code of the
 * ANI that placed the call, and "zip" the area code of the prospect's ZIP
 * (US and CA only).
 */
export type AniPlannerGroupBy = "area_code" | "ani" | "zip";

/**
 * Which ANIs count as "current".
 * "managed" counts only active, managed numbers. "all" counts every number
 * except those removed from the dialer.
 */
export type AniPlannerInventoryMode = "managed" | "all";

/**
 * Country the plan was computed for, detected from the company's dialer.
 * Other values are accepted in case the platform adds countries before the
 * SDK does.
 */
export type AniPlannerCountry = "us" | "ca" | "uk" | (string & {});

/** Request body for POST /ani-planner/generate. */
export interface AniPlannerGenerateRequest {
  /** Start of the range to analyze, "YYYY-MM-DD". Defaults to the start of the current month. */
  dateStart?: string;
  /** End of the range to analyze, "YYYY-MM-DD". Defaults to yesterday. */
  dateEnd?: string;
  /** Target maximum dials per ANI per day. Defaults to "BETTER". */
  dailyDialsTarget?: AniPlannerDailyDialsTarget;
  /** How dial volume is grouped. Defaults to "area_code". */
  groupBy?: AniPlannerGroupBy;
  /** Which ANIs count as "current". Defaults to "managed". */
  inventoryMode?: AniPlannerInventoryMode;
  /**
   * Include only these outbound campaigns, by internal identifier. Provide at
   * most one. Omit both filters to include every campaign. Unknown identifiers
   * return a 400.
   */
  campaigns?: string[];
  /** Include every campaign except these, by internal identifier. */
  campaignsExclude?: string[];
}

/** One region row of a plan, sorted by dailyDialsAverage descending. */
export interface AniPlannerRegionStat {
  /** Region or city name (US/CA), or the comma-joined counties served by the area code (UK). */
  region: string;
  /** State abbreviation (US/CA), "TF" for toll-free, or the area code (UK). */
  state: string;
  /** The area codes rolled up into this region. */
  areaCodes: string[];
  /** ceil(total dials in region / bizDays). */
  dailyDialsAverage: number;
  /** ANIs currently held for this region, per the requested inventoryMode. */
  currentAnis: number;
  /**
   * Recommended ANI count: ceil(dailyDialsAverage / dailyDialsTarget), with a
   * per-region minimum floor. 0 when belowThreshold is true.
   */
  proposedAnis: number;
  /** proposedAnis - currentAnis. Positive means add numbers, negative means over-provisioned. */
  difference: number;
  /**
   * True when the region averages fewer than 20 dials per business day. Such
   * regions are recommended 0 ANIs and excluded from totalProposedAnis, but are
   * still returned so numbers already provisioned there show up as surplus.
   */
  belowThreshold: boolean;
}

/** An outbound campaign of the company, with its mapped inbound campaigns. */
export interface AniPlannerCampaign {
  id: number;
  name: string;
  /** The value to pass in the request campaigns / campaignsExclude filters. */
  internalIdentifier: string;
  campaignType: string;
  inboundCampaignIds: number[];
  inboundCampaignNames: string[];
}

export interface AniPlannerPlan {
  /** Detected from the company's dialer. Determines how regions are grouped. */
  country: AniPlannerCountry;
  /** The effective range that was analyzed, after applying defaults. */
  dateStart: string;
  dateEnd: string;
  /** Weekdays (Mon-Fri) in the range. Daily averages are computed against this. */
  bizDays: number;
  /** The resolved numeric target: 50, 75, or 100. */
  dailyDialsTarget: number;
  groupBy: AniPlannerGroupBy;
  inventoryMode: AniPlannerInventoryMode;
  regionStats: AniPlannerRegionStat[];
  totalDials: number;
  totalContacts: number;
  /** Contact rate across all regions, as a percentage. */
  overallContactRate: number;
  /** ANIs held across every region, including those below the volume threshold. */
  totalCurrentAnis: number;
  /** Recommended ANIs, summing only regions above the volume threshold. */
  totalProposedAnis: number;
  /** totalProposedAnis - totalCurrentAnis, so surplus held in low-volume regions is reflected. */
  aniDifference: number;
  /** True only when groupBy is "zip" but no ZIP area-code data was found despite dials existing. */
  missingZipData: boolean;
  /** Recommended toll-free ANI count. 0 for US/CA, where toll-free is a "TF" row in regionStats. */
  tollFreeRecommendation: number;
  /** Numeric IDs of the outbound campaigns included in the analysis. */
  selectedCampaigns: number[];
  campaigns: AniPlannerCampaign[];
  [key: string]: unknown;
}

export type AniPlannerGenerateResponse =
  | { success: true; data: AniPlannerPlan }
  | { success: false; message: string };

/**
 * ANI Planner: analyzes recent dial volume against current ANI inventory and
 * recommends how many numbers to provision in each region.
 * https://docs.outboundiq.cloud/reference/ani-planner/
 */
export class AniPlannerResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Compute the ANI recommendation for the authenticated company over a date
   * range. POST /ani-planner/generate
   */
  generate(
    request: AniPlannerGenerateRequest = {},
  ): Promise<AniPlannerGenerateResponse> {
    return this.http.request({
      method: "POST",
      path: "/ani-planner/generate",
      body: request,
    });
  }
}
