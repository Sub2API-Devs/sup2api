/**
 * @opentelemetry/core/build/src/utils/url.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/core@2.7.1
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-bwbq4xvm.js:127741-128041 cjs-fingerprint
var require_url = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.isUrlIgnored = cjsExports.urlMatches = undefined;
  function urlMatches(url, urlToMatch) {
    if (typeof urlToMatch === "string") return url === urlToMatch;
    else return !!url.match(urlToMatch);
  }
  cjsExports.urlMatches = urlMatches;
  function isUrlIgnored(url, ignoredUrls) {
    if (!ignoredUrls) return false;
    for (let ignoreUrl of ignoredUrls) if (urlMatches(url, ignoreUrl)) return true;
    return false;
  }
  cjsExports.isUrlIgnored = isUrlIgnored;
});
export { require_url };
