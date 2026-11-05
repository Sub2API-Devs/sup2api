/**
 * @anthropic-ai/sdk/resources/beta/organization/service-accounts/service-accounts.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (1)
 * attribution: esm-fingerprint 1
 */
import { APIResource } from "../../../../core/resource.mjs";
import { Workspaces_2 } from "./workspaces.mjs";
import { buildHeaders } from "../../../../internal/headers.mjs";
import { parseUrl_2 } from "../../../../internal/utils/path.mjs";
import { TokenPage } from "../../../../core/pagination.mjs";

//@ chunk-vn3g7zt8.js:125500-126711 esm-fingerprint
var ServiceAccounts = (() => {
  class ServiceAccounts extends APIResource {
    constructor() {
      super(...arguments);
      this.workspaces = new Workspaces_2(this._client);
    }
    create(params, options) {
      let { betas, ...body } = params;
      return this._client.post("/v1/organizations/service_accounts?beta=true", {
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
    retrieve(serviceAccountID, params = {}, options) {
      let { betas } = params ?? {};
      return this._client.get(parseUrl_2`/v1/organizations/service_accounts/${serviceAccountID}?beta=true`, {
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
    update(serviceAccountID, params, options) {
      let { betas, ...body } = params;
      return this._client.post(parseUrl_2`/v1/organizations/service_accounts/${serviceAccountID}?beta=true`, {
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
      return this._client.getAPIList("/v1/organizations/service_accounts?beta=true", TokenPage, {
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
    archive(serviceAccountID, params = {}, options) {
      let { betas } = params ?? {};
      return this._client.post(
        parseUrl_2`/v1/organizations/service_accounts/${serviceAccountID}/archive?beta=true`,
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
  ServiceAccounts.Workspaces = Workspaces_2;
  return ServiceAccounts;
})();
export { ServiceAccounts };
