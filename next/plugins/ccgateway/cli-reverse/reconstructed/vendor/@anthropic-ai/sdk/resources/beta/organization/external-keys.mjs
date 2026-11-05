/**
 * @anthropic-ai/sdk/resources/beta/organization/external-keys.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (1)
 * attribution: esm-fingerprint 1
 */
import { APIResource } from "../../../core/resource.mjs";
import { parseUrl_2 } from "../../../internal/utils/path.mjs";
import { TokenPage } from "../../../core/pagination.mjs";

//@ chunk-vn3g7zt8.js:120053-120664 esm-fingerprint
class ExternalKeys extends APIResource {
  create(body, options) {
    return this._client.post("/v1/organizations/external_keys?beta=true", {
      body,
      ...options,
    });
  }
  retrieve(externalKeyID, options) {
    return this._client.get(parseUrl_2`/v1/organizations/external_keys/${externalKeyID}?beta=true`, options);
  }
  update(externalKeyID, body, options) {
    return this._client.post(parseUrl_2`/v1/organizations/external_keys/${externalKeyID}?beta=true`, {
      body,
      ...options,
    });
  }
  list(query = {}, options) {
    return this._client.getAPIList("/v1/organizations/external_keys?beta=true", TokenPage, {
      query,
      ...options,
    });
  }
  delete(externalKeyID, options) {
    return this._client.delete(
      parseUrl_2`/v1/organizations/external_keys/${externalKeyID}?beta=true`,
      options,
    );
  }
  validate(externalKeyID, options) {
    return this._client.post(
      parseUrl_2`/v1/organizations/external_keys/${externalKeyID}/validate?beta=true`,
      options,
    );
  }
}
export { ExternalKeys };
