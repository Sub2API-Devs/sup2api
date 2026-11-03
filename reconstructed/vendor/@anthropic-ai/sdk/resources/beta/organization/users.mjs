/**
 * @anthropic-ai/sdk/resources/beta/organization/users.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { APIResource } from "../../../core/resource.mjs";
import { I } from "../../../internal/utils/path.mjs";
import { Page } from "../../../core/pagination.mjs";

//@ chunk-hwmsct5x.js:120791-121173 esm-fingerprint
class Users extends APIResource {
  retrieve(userID, options) {
    return this._client.get(I`/v1/organizations/users/${userID}?beta=true`, options);
  }
  update(userID, body, options) {
    return this._client.post(I`/v1/organizations/users/${userID}?beta=true`, {
      body,
      ...options,
    });
  }
  list(query = {}, options) {
    return this._client.getAPIList("/v1/organizations/users?beta=true", Page, {
      query,
      ...options,
    });
  }
  remove(userID, options) {
    return this._client.delete(I`/v1/organizations/users/${userID}?beta=true`, options);
  }
}
export { Users };
