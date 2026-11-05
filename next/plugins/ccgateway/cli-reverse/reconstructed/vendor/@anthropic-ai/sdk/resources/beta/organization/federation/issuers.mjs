/**
 * @anthropic-ai/sdk/resources/beta/organization/federation/issuers.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (1)
 * attribution: esm-fingerprint 1
 */
import { APIResource } from "../../../../core/resource.mjs";
import { buildHeaders } from "../../../../internal/headers.mjs";
import { parseUrl_2 } from "../../../../internal/utils/path.mjs";
import { TokenPage } from "../../../../core/pagination.mjs";

//@ chunk-vn3g7zt8.js:121553-122662 esm-fingerprint
class Issuers extends APIResource {
  create(params, options) {
    let { betas, ...body } = params;
    return this._client.post("/v1/organizations/federation_issuers?beta=true", {
      body,
      ...options,
      headers: buildHeaders([
        {
          ...(betas?.toString() != null
            ? {
                "anthropic-beta": betas?.toString(),
              }
            : undefined),
        },
        options?.headers,
      ]),
    });
  }
  retrieve(federationIssuerID, params = {}, options) {
    let { betas } = params ?? {};
    return this._client.get(
      parseUrl_2`/v1/organizations/federation_issuers/${federationIssuerID}?beta=true`,
      {
        ...options,
        headers: buildHeaders([
          {
            ...(betas?.toString() != null
              ? {
                  "anthropic-beta": betas?.toString(),
                }
              : undefined),
          },
          options?.headers,
        ]),
      },
    );
  }
  update(federationIssuerID, params, options) {
    let { betas, ...body } = params;
    return this._client.post(
      parseUrl_2`/v1/organizations/federation_issuers/${federationIssuerID}?beta=true`,
      {
        body,
        ...options,
        headers: buildHeaders([
          {
            ...(betas?.toString() != null
              ? {
                  "anthropic-beta": betas?.toString(),
                }
              : undefined),
          },
          options?.headers,
        ]),
      },
    );
  }
  list(params = {}, options) {
    let { betas, ...query } = params ?? {};
    return this._client.getAPIList("/v1/organizations/federation_issuers?beta=true", TokenPage, {
      query,
      ...options,
      headers: buildHeaders([
        {
          ...(betas?.toString() != null
            ? {
                "anthropic-beta": betas?.toString(),
              }
            : undefined),
        },
        options?.headers,
      ]),
    });
  }
  archive(federationIssuerID, params = {}, options) {
    let { betas } = params ?? {};
    return this._client.post(
      parseUrl_2`/v1/organizations/federation_issuers/${federationIssuerID}/archive?beta=true`,
      {
        ...options,
        headers: buildHeaders([
          {
            ...(betas?.toString() != null
              ? {
                  "anthropic-beta": betas?.toString(),
                }
              : undefined),
          },
          options?.headers,
        ]),
      },
    );
  }
}
export { Issuers };
