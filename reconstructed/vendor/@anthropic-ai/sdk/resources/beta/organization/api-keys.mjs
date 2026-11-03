/**
 * @anthropic-ai/sdk/resources/beta/organization/api-keys.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { APIResource } from "../../../core/resource.mjs";
import { I } from "../../../internal/utils/path.mjs";
import { Page } from "../../../core/pagination.mjs";

//@ chunk-hwmsct5x.js:119155-119462 esm-fingerprint
class APIKeys extends APIResource {
  retrieve(apiKeyID, options) {
    return this._client.get(I`/v1/organizations/api_keys/${apiKeyID}?beta=true`, options);
  }
  update(apiKeyID, body, options) {
    return this._client.post(I`/v1/organizations/api_keys/${apiKeyID}?beta=true`, {
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
