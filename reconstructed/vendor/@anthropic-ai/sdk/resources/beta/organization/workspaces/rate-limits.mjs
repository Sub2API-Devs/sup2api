/**
 * @anthropic-ai/sdk/resources/beta/organization/workspaces/rate-limits.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { Y } from "../../../../core/resource.mjs";
import { I } from "../../../../internal/utils/path.mjs";
import { ee } from "../../../../core/pagination.mjs";

//@ chunk-hwmsct5x.js:126969-127113 esm-fingerprint
class fo extends Y {
  list(e, n = {}, r) {
    return this._client.getAPIList(I`/v1/organizations/workspaces/${e}/rate_limits?beta=true`, ee, {
      query: n,
      ...r,
    });
  }
}

export { fo };
