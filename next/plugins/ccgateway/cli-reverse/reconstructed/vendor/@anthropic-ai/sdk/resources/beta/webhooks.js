/**
 * @anthropic-ai/sdk/resources/beta/webhooks.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { __toESM } from "../../../../../runtime/bun-runtime.js";
import { require_standardwebhooks } from "../../../../standardwebhooks/dist/index.js";
import { APIResource } from "../../core/resource.mjs";

//@ chunk-vn3g7zt8.js:53669-53687 esm-layout
var import_standardwebhooks = __toESM(require_standardwebhooks(), 1);
//@ chunk-vn3g7zt8.js:53687-54044 esm-fingerprint
class Webhooks extends APIResource {
  parseUnverified(body) {
    return JSON.parse(body);
  }
  unwrap(body, options) {
    let headers = options?.headers;
    if (headers == null) throw Error("Webhook headers are required in order to verify the signature");
    let keyStr = options.key === undefined ? this._client.webhookKey : options.key;
    if (!keyStr) throw Error("Webhook key must not be null or empty in order to unwrap");
    new import_standardwebhooks.Webhook(keyStr).verify(body, headers);
    return JSON.parse(body);
  }
}
export { Webhooks };
