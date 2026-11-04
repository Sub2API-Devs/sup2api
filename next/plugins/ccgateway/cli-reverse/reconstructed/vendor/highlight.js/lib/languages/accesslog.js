/**
 * highlight.js/lib/languages/accesslog.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:981-1742 cjs-fingerprint
var require_accesslog = __commonJS(function (cjsExports, cjsModule) {
  function accesslog(hljs) {
    let regex = hljs.regex;
    let HTTP_VERBS = ["GET", "POST", "HEAD", "PUT", "DELETE", "CONNECT", "OPTIONS", "PATCH", "TRACE"];
    return {
      name: "Apache Access Log",
      contains: [
        {
          className: "number",
          begin: /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d{1,5})?\b/,
          relevance: 5,
        },
        {
          className: "number",
          begin: /\b\d+\b/,
          relevance: 0,
        },
        {
          className: "string",
          begin: regex.concat(/"/, regex.either(...HTTP_VERBS)),
          end: /"/,
          keywords: HTTP_VERBS,
          illegal: /\n/,
          relevance: 5,
          contains: [
            {
              begin: /HTTP\/[12]\.\d'/,
              relevance: 5,
            },
          ],
        },
        {
          className: "string",
          begin: /\[\d[^\]\n]{8,}\]/,
          illegal: /\n/,
          relevance: 1,
        },
        {
          className: "string",
          begin: /\[/,
          end: /\]/,
          illegal: /\n/,
          relevance: 0,
        },
        {
          className: "string",
          begin: /"Mozilla\/\d\.\d \(/,
          end: /"/,
          illegal: /\n/,
          relevance: 3,
        },
        {
          className: "string",
          begin: /"/,
          end: /"/,
          illegal: /\n/,
          relevance: 0,
        },
      ],
    };
  }
  cjsModule.exports = accesslog;
});
export { require_accesslog };
