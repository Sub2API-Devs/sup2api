/**
 * highlight.js/lib/languages/csp.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:96657-97184 cjs-fingerprint
var require_csp = x(function (cjsExports, cjsModule) {
  function csp(e) {
    return {
      name: "CSP",
      case_insensitive: false,
      keywords: {
        $pattern: "[a-zA-Z][a-zA-Z0-9_-]*",
        keyword: [
          "base-uri",
          "child-src",
          "connect-src",
          "default-src",
          "font-src",
          "form-action",
          "frame-ancestors",
          "frame-src",
          "img-src",
          "manifest-src",
          "media-src",
          "object-src",
          "plugin-types",
          "report-uri",
          "sandbox",
          "script-src",
          "style-src",
          "trusted-types",
          "unsafe-hashes",
          "worker-src",
        ],
      },
      contains: [
        {
          className: "string",
          begin: "'",
          end: "'",
        },
        {
          className: "attribute",
          begin: "^Content",
          end: ":",
          excludeEnd: true,
        },
      ],
    };
  }
  cjsModule.exports = csp;
});
export { require_csp };
