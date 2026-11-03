/**
 * @anthropic-ai/sdk/resources/beta/organization/api-keys.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { Y } from "../../../core/resource.mjs";
import { I } from "../../../internal/utils/path.mjs";
import { Be } from "../../../core/pagination.mjs";

//@ chunk-hwmsct5x.js:119155-119462 esm-fingerprint
class Zr extends Y {
  retrieve(e, n) {
    return this._client.get(I`/v1/organizations/api_keys/${e}?beta=true`, n);
  }
  update(e, n, r) {
    return this._client.post(I`/v1/organizations/api_keys/${e}?beta=true`, { body: n, ...r });
  }
  list(e = {}, n) {
    return this._client.getAPIList("/v1/organizations/api_keys?beta=true", Be, { query: e, ...n });
  }
}

export { Zr };
