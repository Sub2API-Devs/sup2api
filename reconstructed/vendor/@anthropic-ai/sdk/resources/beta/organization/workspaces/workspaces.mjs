/**
 * @anthropic-ai/sdk/resources/beta/organization/workspaces/workspaces.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { APIResource } from "../../../../core/resource.mjs";
import { RateLimits_2 } from "./rate-limits.mjs";
import { Members } from "./members.mjs";
import { ServiceAccounts_2 } from "./service-accounts.mjs";
import { buildHeaders } from "../../../../internal/headers.mjs";
import { I } from "../../../../internal/utils/path.mjs";
import { Page } from "../../../../core/pagination.mjs";

//@ chunk-hwmsct5x.js:128319-129152 esm-fingerprint
var Workspaces_3 = (() => {
  class Workspaces extends APIResource {
    constructor() {
      super(...arguments);
      this.rateLimits = new RateLimits_2(this._client);
      this.members = new Members(this._client);
      this.serviceAccounts = new ServiceAccounts_2(this._client);
    }
    create(params, options) {
      let { betas, ...body } = params;
      return this._client.post("/v1/organizations/workspaces?beta=true", {
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
    retrieve(workspaceID, options) {
      return this._client.get(I`/v1/organizations/workspaces/${workspaceID}?beta=true`, options);
    }
    update(workspaceID, body, options) {
      return this._client.post(I`/v1/organizations/workspaces/${workspaceID}?beta=true`, {
        body,
        ...options,
      });
    }
    list(query = {}, options) {
      return this._client.getAPIList("/v1/organizations/workspaces?beta=true", Page, {
        query,
        ...options,
      });
    }
    archive(workspaceID, options) {
      return this._client.post(I`/v1/organizations/workspaces/${workspaceID}/archive?beta=true`, options);
    }
  }
  Workspaces.RateLimits = RateLimits_2;
  Workspaces.Members = Members;
  Workspaces.ServiceAccounts = ServiceAccounts_2;
  return Workspaces;
})();
export { Workspaces_3 };
