/**
 * @anthropic-ai/sdk/resources/beta/organization/workspaces/workspaces.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { Y } from "../../../../core/resource.mjs";
import { fo } from "./rate-limits.mjs";
import { co } from "./members.mjs";
import { po } from "./service-accounts.mjs";
import { T } from "../../../../internal/headers.mjs";
import { I } from "../../../../internal/utils/path.mjs";
import { Be } from "../../../../core/pagination.mjs";

//@ chunk-hwmsct5x.js:128319-129152 esm-fingerprint
var Ks = (() => {
  class e extends Y {
    constructor() {
      super(...arguments);
      ((this.rateLimits = new fo(this._client)),
        (this.members = new co(this._client)),
        (this.serviceAccounts = new po(this._client)));
    }
    create(n, r) {
      let { betas: betas, ...h } = n;
      return this._client.post("/v1/organizations/workspaces?beta=true", {
        body: h,
        ...r,
        headers: T([
          { ...(betas?.toString() != null ? { "anthropic-beta": betas?.toString() } : void 0) },
          r?.headers,
        ]),
      });
    }
    retrieve(n, r) {
      return this._client.get(I`/v1/organizations/workspaces/${n}?beta=true`, r);
    }
    update(n, r, s) {
      return this._client.post(I`/v1/organizations/workspaces/${n}?beta=true`, { body: r, ...s });
    }
    list(n = {}, r) {
      return this._client.getAPIList("/v1/organizations/workspaces?beta=true", Be, { query: n, ...r });
    }
    archive(n, r) {
      return this._client.post(I`/v1/organizations/workspaces/${n}/archive?beta=true`, r);
    }
  }
  return ((e.RateLimits = fo), (e.Members = co), (e.ServiceAccounts = po), e);
})();

export { Ks };
