/**
 * highlight.js/lib/languages/taggerscript.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:491187-491619 cjs-fingerprint
var No = x(function (cb, To) {
  function Ym(e) {
    return {
      name: "Tagger Script",
      contains: [
        {
          className: "comment",
          begin: /\$noop\(/,
          end: /\)/,
          contains: [
            { begin: /\\[()]/ },
            { begin: /\(/, end: /\)/, contains: [{ begin: /\\[()]/ }, "self"] },
          ],
          relevance: 10,
        },
        { className: "keyword", begin: /\$[_a-zA-Z0-9]+(?=\()/ },
        { className: "variable", begin: /%[_a-zA-Z0-9:]+%/ },
        { className: "symbol", begin: /\\[\\nt$%,()]/ },
        { className: "symbol", begin: /\\u[a-fA-F0-9]{4}/ },
      ],
    };
  }
  To.exports = Ym;
});

export { No };
