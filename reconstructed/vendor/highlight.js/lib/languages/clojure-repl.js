/**
 * highlight.js/lib/languages/clojure-repl.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:69559-69747 cjs-fingerprint
var require_clojure_repl = x(function (cjsExports, cjsModule) {
  function clojureRepl(hljs) {
    return {
      name: "Clojure REPL",
      contains: [
        {
          className: "meta.prompt",
          begin: /^([\w.-]+|\s*#_)?=>/,
          starts: {
            end: /$/,
            subLanguage: "clojure",
          },
        },
      ],
    };
  }
  cjsModule.exports = clojureRepl;
});
export { require_clojure_repl };
