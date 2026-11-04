/**
 * highlight.js/lib/languages/vbscript-html.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:512446-512608 cjs-fingerprint
var require_vbscript_html = __commonJS(function (cjsExports, cjsModule) {
  function vbscriptHtml(hljs) {
    return {
      name: "VBScript in HTML",
      subLanguage: "xml",
      contains: [
        {
          begin: "<%",
          end: "%>",
          subLanguage: "vbscript",
        },
      ],
    };
  }
  cjsModule.exports = vbscriptHtml;
});
export { require_vbscript_html };
