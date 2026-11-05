/**
 * @anthropic-ai/sdk/resources/beta/organization/federation/rules/rules.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (1)
 * attribution: esm-fingerprint 1
 */
import { APIResource } from "../../../../../core/resource.mjs";
import { Workspaces } from "./workspaces.mjs";
import { buildHeaders } from "../../../../../internal/headers.mjs";
import { parseUrl_2 } from "../../../../../internal/utils/path.mjs";
import { TokenPage } from "../../../../../core/pagination.mjs";

//@ chunk-vn3g7zt8.js:123391-124602 esm-fingerprint
var Rules = (() => {
  class Rules extends APIResource {
    constructor() {
      super(...arguments);
      this.workspaces = new Workspaces(this._client);
    }
    create(params, options) {
      let { betas, ...body } = params;
      return this._client.post("/v1/organizations/federation_rules?beta=true", {
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
    retrieve(federationRuleID, params = {}, options) {
      let { betas } = params ?? {};
      return this._client.get(parseUrl_2`/v1/organizations/federation_rules/${federationRuleID}?beta=true`, {
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
    update(federationRuleID, params, options) {
      let { betas, ...body } = params;
      return this._client.post(parseUrl_2`/v1/organizations/federation_rules/${federationRuleID}?beta=true`, {
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
    list(params = {}, options) {
      let { betas, ...query } = params ?? {};
      return this._client.getAPIList("/v1/organizations/federation_rules?beta=true", TokenPage, {
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
    archive(federationRuleID, params = {}, options) {
      let { betas } = params ?? {};
      return this._client.post(
        parseUrl_2`/v1/organizations/federation_rules/${federationRuleID}/archive?beta=true`,
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
  Rules.Workspaces = Workspaces;
  return Rules;
})();
export { Rules };
