/**
 * @anthropic-ai/sdk/resources/beta/organization/rate-limits.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (1)
 * attribution: esm-fingerprint 1
 */
import { APIResource } from "../../../core/resource.mjs";
import { TokenPage } from "../../../core/pagination.mjs";

//@ chunk-vn3g7zt8.js:121046-121171 esm-fingerprint
class RateLimits extends APIResource {
  list(query = {}, options) {
    return this._client.getAPIList("/v1/organizations/rate_limits?beta=true", TokenPage, {
      query,
      ...options,
    });
  }
}
export { RateLimits };
