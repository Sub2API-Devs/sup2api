/**
 * @anthropic-ai/sdk/resources/beta/webhooks.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { Re } from "../../../../../runtime/bun-runtime.js";
import { Hu } from "../../../../standardwebhooks/dist/index.js";
import { Y } from "../../core/resource.mjs";

//@ chunk-hwmsct5x.js:53298-53316 esm-layout
var $u = Re(Hu(), 1);
//@ chunk-hwmsct5x.js:53316-53673 esm-fingerprint
class Mr extends Y {
  parseUnverified(e) {
    return JSON.parse(e);
  }
  unwrap(e, n) {
    let r = n?.headers;
    if (r == null) throw Error("Webhook headers are required in order to verify the signature");
    let s = n.key === void 0 ? this._client.webhookKey : n.key;
    if (!s) throw Error("Webhook key must not be null or empty in order to unwrap");
    return (new $u.Webhook(s).verify(e, r), JSON.parse(e));
  }
}

export { Mr };
