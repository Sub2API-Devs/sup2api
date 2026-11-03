/**
 * @typespec/ts-http-runtime/dist/esm/policies/logPolicy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @typespec/ts-http-runtime@0.2.3..0.3.0
 * pieces: chunk-mrx6y2r5.js (2)
 * attribution: esm-fingerprint 2
 */
import { Ve } from "../log.js";
import { tt } from "../util/sanitizer.js";

//@ chunk-mrx6y2r5.js:49396-49415 esm-fingerprint
var LOGPOLICY = "logPolicy";
//@ chunk-mrx6y2r5.js:49415-49828 esm-fingerprint
function sa(e = {}) {
  var t;
  let r = (t = e.logger) !== null && t !== void 0 ? t : Ve.info,
    n = new tt({
      additionalAllowedHeaderNames: e.additionalAllowedHeaderNames,
      additionalAllowedQueryParameters: e.additionalAllowedQueryParameters,
    });
  return {
    name: LOGPOLICY,
    async sendRequest(o, i) {
      if (!r.enabled) return i(o);
      r(`Request: ${n.sanitize(o)}`);
      let s = await i(o);
      return (r(`Response status code: ${s.status}`), r(`Headers: ${n.sanitize(s.headers)}`), s);
    },
  };
}

export { sa };
