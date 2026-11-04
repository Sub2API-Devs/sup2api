/**
 * highlight.js/lib/languages/profile.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:372222-372714 cjs-fingerprint
var require_profile = __commonJS(function (cjsExports, cjsModule) {
  function profile(hljs) {
    return {
      name: "Python profiler",
      contains: [
        hljs.C_NUMBER_MODE,
        {
          begin: "[a-zA-Z_][\\da-zA-Z_]+\\.[\\da-zA-Z_]{1,3}",
          end: ":",
          excludeEnd: true,
        },
        {
          begin: "(ncalls|tottime|cumtime)",
          end: "$",
          keywords: "ncalls tottime|10 cumtime|10 filename",
          relevance: 10,
        },
        {
          begin: "function calls",
          end: "$",
          contains: [hljs.C_NUMBER_MODE],
          relevance: 10,
        },
        hljs.APOS_STRING_MODE,
        hljs.QUOTE_STRING_MODE,
        {
          className: "string",
          begin: "\\(",
          end: "\\)$",
          excludeBegin: true,
          excludeEnd: true,
          relevance: 0,
        },
      ],
    };
  }
  cjsModule.exports = profile;
});
export { require_profile };
