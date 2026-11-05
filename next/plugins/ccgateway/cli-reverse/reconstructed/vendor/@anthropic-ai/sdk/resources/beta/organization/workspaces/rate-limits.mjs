/**
 * @anthropic-ai/sdk/resources/beta/organization/workspaces/rate-limits.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (1)
 * attribution: esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { APIResource } from "../../../../core/resource.mjs";
import { parseUrl_2 } from "../../../../internal/utils/path.mjs";
import { TokenPage } from "../../../../core/pagination.mjs";

//@ chunk-vn3g7zt8.js:127349-127493 esm-fingerprint
class RateLimits_2 extends APIResource {
  list(workspaceID, query = {}, options) {
    return this._client.getAPIList(
      parseUrl_2`/v1/organizations/workspaces/${workspaceID}/rate_limits?beta=true`,
      TokenPage,
      {
        query,
        ...options,
      },
    );
  }
}
export { RateLimits_2 };
