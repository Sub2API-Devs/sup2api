/**
 * @anthropic-ai/sdk/resources/beta/organization/organization.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { Y } from "../../../core/resource.mjs";
import { Zr } from "./api-keys.mjs";
import { to } from "./external-keys.mjs";
import { Gs } from "./federation/federation.mjs";
import { no } from "./invites.mjs";
import { Ys } from "./service-accounts/service-accounts.mjs";
import { io } from "./users.mjs";
import { Ks } from "./workspaces/workspaces.mjs";
import { so } from "./rate-limits.mjs";
import { eo } from "./compliance-settings.mjs";

//@ chunk-hwmsct5x.js:129152-129788 esm-fingerprint
var Vs = (() => {
  class e extends Y {
    constructor() {
      super(...arguments);
      ((this.apiKeys = new Zr(this._client)),
        (this.externalKeys = new to(this._client)),
        (this.federation = new Gs(this._client)),
        (this.invites = new no(this._client)),
        (this.serviceAccounts = new Ys(this._client)),
        (this.users = new io(this._client)),
        (this.workspaces = new Ks(this._client)),
        (this.rateLimits = new so(this._client)),
        (this.complianceSettings = new eo(this._client)));
    }
    retrieve(n) {
      return this._client.get("/v1/organizations/me?beta=true", n);
    }
  }
  return (
    (e.APIKeys = Zr),
    (e.ExternalKeys = to),
    (e.Federation = Gs),
    (e.Invites = no),
    (e.ServiceAccounts = Ys),
    (e.Users = io),
    (e.Workspaces = Ks),
    (e.RateLimits = so),
    (e.ComplianceSettings = eo),
    e
  );
})();

export { Vs };
