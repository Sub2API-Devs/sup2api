/**
 * @anthropic-ai/sdk/resources/beta/organization/workspaces/rate-limits.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { APIResource } from "../../../../core/resource.mjs";
import { I } from "../../../../internal/utils/path.mjs";
import { TokenPage } from "../../../../core/pagination.mjs";

//@ chunk-hwmsct5x.js:126969-127113 esm-fingerprint
class RateLimits_2 extends APIResource {
  list(workspaceID, query = {}, options) {
    return this._client.getAPIList(
      I`/v1/organizations/workspaces/${workspaceID}/rate_limits?beta=true`,
      TokenPage,
      {
        query,
        ...options,
      },
    );
  }
}
export { RateLimits_2 };
