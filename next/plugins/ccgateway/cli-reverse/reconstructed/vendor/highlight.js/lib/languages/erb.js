/**
 * highlight.js/lib/languages/erb.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:130149-130357 cjs-fingerprint
var require_erb = __commonJS(function (cjsExports, cjsModule) {
  function erb(hljs) {
    return {
      name: "ERB",
      subLanguage: "xml",
      contains: [
        hljs.COMMENT("<%#", "%>"),
        {
          begin: "<%[%=-]?",
          end: "[%-]?%>",
          subLanguage: "ruby",
          excludeBegin: true,
          excludeEnd: true,
        },
      ],
    };
  }
  cjsModule.exports = erb;
});
export { require_erb };
