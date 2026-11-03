/**
 * highlight.js/lib/languages/python-repl.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:384148-384386 cjs-fingerprint
var require_python_repl = x(function (cjsExports, cjsModule) {
  function pythonRepl(hljs) {
    return {
      aliases: ["pycon"],
      contains: [
        {
          className: "meta.prompt",
          starts: {
            end: / |$/,
            starts: {
              end: "$",
              subLanguage: "python",
            },
          },
          variants: [
            {
              begin: /^>>>(?=[ ]|$)/,
            },
            {
              begin: /^\.\.\.(?=[ ]|$)/,
            },
          ],
        },
      ],
    };
  }
  cjsModule.exports = pythonRepl;
});
export { require_python_repl };
