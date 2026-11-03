/**
 * highlight.js/lib/languages/nestedtext.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:308874-309437 cjs-fingerprint
var di = x(function (og, li) {
  function Op(e) {
    let t = { match: [/^\s*(?=\S)/, /[^:]+/, /:\s*/, /$/], className: { 2: "attribute", 3: "punctuation" } },
      n = {
        match: [/^\s*(?=\S)/, /[^:]*[^: ]/, /[ ]*:/, /[ ]/, /.*$/],
        className: { 2: "attribute", 3: "punctuation", 5: "string" },
      },
      a = { match: [/^\s*/, />/, /[ ]/, /.*$/], className: { 2: "punctuation", 4: "string" } },
      s = {
        variants: [{ match: [/^\s*/, /-/, /[ ]/, /.*$/] }, { match: [/^\s*/, /-$/] }],
        className: { 2: "bullet", 4: "string" },
      };
    return {
      name: "Nested Text",
      aliases: ["nt"],
      contains: [e.inherit(e.HASH_COMMENT_MODE, { begin: /^\s*(?=#)/, excludeBegin: !0 }), s, a, t, n],
    };
  }
  li.exports = Op;
});

export { di };
