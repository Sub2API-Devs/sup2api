/**
 * @anthropic-ai/sdk/resources/beta/organization/invites.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (1)
 * attribution: esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { APIResource } from "../../../core/resource.mjs";
import { parseUrl_2 } from "../../../internal/utils/path.mjs";
import { Page } from "../../../core/pagination.mjs";

//@ chunk-vn3g7zt8.js:120664-121046 esm-fingerprint
class Invites extends APIResource {
  create(body, options) {
    return this._client.post("/v1/organizations/invites?beta=true", {
      body,
      ...options,
    });
  }
  retrieve(inviteID, options) {
    return this._client.get(parseUrl_2`/v1/organizations/invites/${inviteID}?beta=true`, options);
  }
  list(query = {}, options) {
    return this._client.getAPIList("/v1/organizations/invites?beta=true", Page, {
      query,
      ...options,
    });
  }
  delete(inviteID, options) {
    return this._client.delete(parseUrl_2`/v1/organizations/invites/${inviteID}?beta=true`, options);
  }
}
export { Invites };
