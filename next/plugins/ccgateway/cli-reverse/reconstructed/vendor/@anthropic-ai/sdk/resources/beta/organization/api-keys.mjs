/**
 * @anthropic-ai/sdk/resources/beta/organization/api-keys.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (1)
 * attribution: esm-fingerprint 1
 */
import { APIResource } from "../../../core/resource.mjs";
import { parseUrl_2 } from "../../../internal/utils/path.mjs";
import { Page } from "../../../core/pagination.mjs";

//@ chunk-vn3g7zt8.js:119535-119842 esm-fingerprint
class APIKeys extends APIResource {
  retrieve(apiKeyID, options) {
    return this._client.get(parseUrl_2`/v1/organizations/api_keys/${apiKeyID}?beta=true`, options);
  }
  update(apiKeyID, body, options) {
    return this._client.post(parseUrl_2`/v1/organizations/api_keys/${apiKeyID}?beta=true`, {
      body,
      ...options,
    });
  }
  list(query = {}, options) {
    return this._client.getAPIList("/v1/organizations/api_keys?beta=true", Page, {
      query,
      ...options,
    });
  }
}
export { APIKeys };
