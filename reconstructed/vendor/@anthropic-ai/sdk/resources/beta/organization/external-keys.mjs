/**
 * @anthropic-ai/sdk/resources/beta/organization/external-keys.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { Y } from "../../../core/resource.mjs";
import { I } from "../../../internal/utils/path.mjs";
import { ee } from "../../../core/pagination.mjs";

//@ chunk-hwmsct5x.js:119673-120284 esm-fingerprint
class to extends Y {
  create(e, n) {
    return this._client.post("/v1/organizations/external_keys?beta=true", { body: e, ...n });
  }
  retrieve(e, n) {
    return this._client.get(I`/v1/organizations/external_keys/${e}?beta=true`, n);
  }
  update(e, n, r) {
    return this._client.post(I`/v1/organizations/external_keys/${e}?beta=true`, { body: n, ...r });
  }
  list(e = {}, n) {
    return this._client.getAPIList("/v1/organizations/external_keys?beta=true", ee, { query: e, ...n });
  }
  delete(e, n) {
    return this._client.delete(I`/v1/organizations/external_keys/${e}?beta=true`, n);
  }
  validate(e, n) {
    return this._client.post(I`/v1/organizations/external_keys/${e}/validate?beta=true`, n);
  }
}

export { to };
