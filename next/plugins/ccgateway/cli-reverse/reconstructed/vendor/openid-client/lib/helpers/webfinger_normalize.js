/**
 * openid-client/lib/helpers/webfinger_normalize.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-1ny7cxrt.js:68948-69495 cjs-fingerprint
var require_webfinger_normalize = __commonJS(function (cjsExports, cjsModule) {
  var PORT = /^\d+$/;
  function hasScheme(input) {
    if (input.includes("://")) return true;
    let authority = input.replace(/(\/|\?)/g, "#").split("#")[0];
    if (authority.includes(":")) {
      let index = authority.indexOf(":");
      let hostOrPort = authority.slice(index + 1);
      if (!PORT.test(hostOrPort)) return true;
    }
    return false;
  }
  function acctSchemeAssumed(input) {
    if (!input.includes("@")) return false;
    let parts = input.split("@");
    let host = parts[parts.length - 1];
    return !(host.includes(":") || host.includes("/") || host.includes("?"));
  }
  function normalize(input) {
    if (typeof input !== "string") throw TypeError("input must be a string");
    let output;
    if (hasScheme(input)) output = input;
    else if (acctSchemeAssumed(input)) output = `acct:${input}`;
    else output = `https://${input}`;
    return output.split("#")[0];
  }
  cjsModule.exports = normalize;
});
export { require_webfinger_normalize };
