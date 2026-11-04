/**
 * highlight.js/lib/languages/shell.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:435514-435762 cjs-fingerprint
var require_shell = __commonJS(function (cjsExports, cjsModule) {
  function shell(hljs) {
    return {
      name: "Shell Session",
      aliases: ["console", "shellsession"],
      contains: [
        {
          className: "meta.prompt",
          begin: /^\s{0,3}[/~\w\d[\]()@-]*[>%$#][ ]?/,
          starts: {
            end: /[^\\](?=\s*$)/,
            subLanguage: "bash",
          },
        },
      ],
    };
  }
  cjsModule.exports = shell;
});
export { require_shell };
