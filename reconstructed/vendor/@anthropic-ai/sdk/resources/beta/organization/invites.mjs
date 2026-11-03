/**
 * @anthropic-ai/sdk/resources/beta/organization/invites.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { Y } from "../../../core/resource.mjs";
import { I } from "../../../internal/utils/path.mjs";
import { Be } from "../../../core/pagination.mjs";

//@ chunk-hwmsct5x.js:120284-120666 esm-fingerprint
class no extends Y {
  create(e, n) {
    return this._client.post("/v1/organizations/invites?beta=true", { body: e, ...n });
  }
  retrieve(e, n) {
    return this._client.get(I`/v1/organizations/invites/${e}?beta=true`, n);
  }
  list(e = {}, n) {
    return this._client.getAPIList("/v1/organizations/invites?beta=true", Be, { query: e, ...n });
  }
  delete(e, n) {
    return this._client.delete(I`/v1/organizations/invites/${e}?beta=true`, n);
  }
}

export { no };
