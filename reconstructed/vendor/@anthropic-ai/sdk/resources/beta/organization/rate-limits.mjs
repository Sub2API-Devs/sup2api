/**
 * @anthropic-ai/sdk/resources/beta/organization/rate-limits.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { Y } from "../../../core/resource.mjs";
import { ee } from "../../../core/pagination.mjs";

//@ chunk-hwmsct5x.js:120666-120791 esm-fingerprint
class so extends Y {
  list(e = {}, n) {
    return this._client.getAPIList("/v1/organizations/rate_limits?beta=true", ee, { query: e, ...n });
  }
}

export { so };
