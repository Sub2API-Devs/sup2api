/**
 * @anthropic-ai/sdk/resources/beta/organization/organization.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { APIResource } from "../../../core/resource.mjs";
import { APIKeys } from "./api-keys.mjs";
import { ExternalKeys } from "./external-keys.mjs";
import { Federation } from "./federation/federation.mjs";
import { Invites } from "./invites.mjs";
import { ServiceAccounts } from "./service-accounts/service-accounts.mjs";
import { Users } from "./users.mjs";
import { Workspaces_3 } from "./workspaces/workspaces.mjs";
import { RateLimits } from "./rate-limits.mjs";
import { ComplianceSettings } from "./compliance-settings.mjs";

//@ chunk-hwmsct5x.js:129152-129788 esm-fingerprint
var Organization = (() => {
  class Organization extends APIResource {
    constructor() {
      super(...arguments);
      this.apiKeys = new APIKeys(this._client);
      this.externalKeys = new ExternalKeys(this._client);
      this.federation = new Federation(this._client);
      this.invites = new Invites(this._client);
      this.serviceAccounts = new ServiceAccounts(this._client);
      this.users = new Users(this._client);
      this.workspaces = new Workspaces_3(this._client);
      this.rateLimits = new RateLimits(this._client);
      this.complianceSettings = new ComplianceSettings(this._client);
    }
    retrieve(options) {
      return this._client.get("/v1/organizations/me?beta=true", options);
    }
  }
  Organization.APIKeys = APIKeys;
  Organization.ExternalKeys = ExternalKeys;
  Organization.Federation = Federation;
  Organization.Invites = Invites;
  Organization.ServiceAccounts = ServiceAccounts;
  Organization.Users = Users;
  Organization.Workspaces = Workspaces_3;
  Organization.RateLimits = RateLimits;
  Organization.ComplianceSettings = ComplianceSettings;
  return Organization;
})();
export { Organization };
