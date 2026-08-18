import type { HttpClient } from "../core/http";

export type CustomCampaignType = "Inbound" | "Outbound" | "Blended";

export interface CustomCampaign {
  /** Your dialer's identifier for the campaign. */
  id: string;
  name: string;
  type: CustomCampaignType;
  inbound_pool_id?: string;
}

export interface CustomCampaignUpdate {
  id: string;
  name?: string;
  type?: CustomCampaignType;
  inbound_pool_id?: string;
}

export type CustomDispoType = "System" | "Agent";

export interface CustomDispo {
  /** Your dialer's identifier for the disposition. */
  id: string;
  name: string;
  type: CustomDispoType;
  /** Whether this disposition counts as a contact. */
  contact: boolean;
  /** Whether this disposition counts as a success. */
  success: boolean;
}

export interface CustomDispoUpdate {
  id: string;
  name?: string;
  type?: CustomDispoType;
  contact?: boolean;
  success?: boolean;
}

export type CountryCode = "+1" | "+44";

export interface CustomAni {
  country_code: CountryCode;
  /** Phone number. Formatting characters are stripped by the API before storage. */
  number: string;
  inbound_group_id: string;
  is_branded?: boolean;
  brand_name?: string;
  carrier_id?: string;
}

export interface CustomAniUpdate {
  number: string;
  country_code?: CountryCode;
  inbound_group_id?: string;
  is_branded?: boolean;
  brand_name?: string;
  carrier_id?: string;
}

/**
 * Generic acknowledgement envelope. The documentation does not pin down every
 * response shape for this API, so unknown fields are preserved.
 */
export interface CustomApiResponse {
  success?: boolean;
  message?: string;
  [key: string]: unknown;
}

export interface GetCustomAniResponse {
  success: boolean;
  ani: CustomAni & { [key: string]: unknown };
}

export class CustomCampaigns {
  constructor(private readonly http: HttpClient) {}

  /** POST /custom/campaigns */
  create(campaign: CustomCampaign): Promise<CustomApiResponse> {
    return this.http.request({
      method: "POST",
      path: "/custom/campaigns",
      body: campaign,
    });
  }

  /** PUT /custom/campaigns */
  update(campaign: CustomCampaignUpdate): Promise<CustomApiResponse> {
    return this.http.request({
      method: "PUT",
      path: "/custom/campaigns",
      body: campaign,
    });
  }

  /** GET /custom/campaigns?id= */
  get(id: string): Promise<CustomApiResponse> {
    return this.http.request({
      method: "GET",
      path: "/custom/campaigns",
      query: { id },
    });
  }

  /** DELETE /custom/campaigns */
  delete(id: string): Promise<CustomApiResponse> {
    return this.http.request({
      method: "DELETE",
      path: "/custom/campaigns",
      body: { id },
    });
  }
}

export class CustomDispos {
  constructor(private readonly http: HttpClient) {}

  /** POST /custom/dispos */
  create(dispo: CustomDispo): Promise<CustomApiResponse> {
    return this.http.request({
      method: "POST",
      path: "/custom/dispos",
      body: dispo,
    });
  }

  /** PUT /custom/dispos */
  update(dispo: CustomDispoUpdate): Promise<CustomApiResponse> {
    return this.http.request({
      method: "PUT",
      path: "/custom/dispos",
      body: dispo,
    });
  }

  /** GET /custom/dispos?id= */
  get(id: string): Promise<CustomApiResponse> {
    return this.http.request({
      method: "GET",
      path: "/custom/dispos",
      query: { id },
    });
  }

  /** DELETE /custom/dispos */
  delete(id: string): Promise<CustomApiResponse> {
    return this.http.request({
      method: "DELETE",
      path: "/custom/dispos",
      body: { id },
    });
  }
}

export class CustomAnis {
  constructor(private readonly http: HttpClient) {}

  /** POST /custom/anis */
  create(ani: CustomAni): Promise<CustomApiResponse> {
    return this.http.request({
      method: "POST",
      path: "/custom/anis",
      body: ani,
    });
  }

  /** PUT /custom/anis */
  update(ani: CustomAniUpdate): Promise<CustomApiResponse> {
    return this.http.request({
      method: "PUT",
      path: "/custom/anis",
      body: ani,
    });
  }

  /** GET /custom/anis?number= */
  get(number: string): Promise<GetCustomAniResponse> {
    return this.http.request({
      method: "GET",
      path: "/custom/anis",
      query: { number },
    });
  }

  /** DELETE /custom/anis */
  delete(number: string): Promise<CustomApiResponse> {
    return this.http.request({
      method: "DELETE",
      path: "/custom/anis",
      body: { number },
    });
  }
}

/**
 * Custom dialer integration: sync campaigns, dispositions, and ANIs from any
 * dialer into outboundIQ.
 * https://docs.outboundiq.cloud/reference/custom
 */
export class CustomDialerResource {
  readonly campaigns: CustomCampaigns;
  readonly dispos: CustomDispos;
  readonly anis: CustomAnis;

  constructor(http: HttpClient) {
    this.campaigns = new CustomCampaigns(http);
    this.dispos = new CustomDispos(http);
    this.anis = new CustomAnis(http);
  }
}
