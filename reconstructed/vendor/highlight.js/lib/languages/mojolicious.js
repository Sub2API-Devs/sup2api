/**
 * highlight.js/lib/languages/mojolicious.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:301777-302076 cjs-fingerprint
var require_mojolicious = __commonJS(function (cjsExports, cjsModule) {
  function mojolicious(hljs) {
    return {
      name: "Mojolicious",
      subLanguage: "xml",
      contains: [
        {
          className: "meta",
          begin: "^__(END|DATA)__$",
        },
        {
          begin: "^\\s*%{1,2}={0,2}",
          end: "$",
          subLanguage: "perl",
        },
        {
          begin: "<%{1,2}={0,2}",
          end: "={0,1}%>",
          subLanguage: "perl",
          excludeBegin: true,
          excludeEnd: true,
        },
      ],
    };
  }
  cjsModule.exports = mojolicious;
});
export { require_mojolicious };
