/**
 * highlight.js/lib/languages/leaf.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:229632-230327 cjs-fingerprint
var Or = x(function (HE, Rr) {
  function Vd(e) {
    let t = /([A-Za-z_][A-Za-z_0-9]*)?/,
      a = {
        scope: "params",
        begin: /\(/,
        end: /\)(?=\:?)/,
        endsParent: !0,
        relevance: 7,
        contains: [
          { scope: "string", begin: '"', end: '"' },
          { scope: "keyword", match: ["true", "false", "in"].join("|") },
          { scope: "variable", match: /[A-Za-z_][A-Za-z_0-9]*/ },
          { scope: "operator", match: /\+|\-|\*|\/|\%|\=\=|\=|\!|\>|\<|\&\&|\|\|/ },
        ],
      },
      s = { match: [t, /(?=\()/], scope: { 1: "keyword" }, contains: [a] };
    return (
      a.contains.unshift(s),
      {
        name: "Leaf",
        contains: [
          {
            match: [/#+/, t, /(?=\()/],
            scope: { 1: "punctuation", 2: "keyword" },
            starts: { contains: [{ match: /\:/, scope: "punctuation" }] },
            contains: [a],
          },
          { match: [/#+/, t, /:?/], scope: { 1: "punctuation", 2: "keyword", 3: "punctuation" } },
        ],
      }
    );
  }
  Rr.exports = Vd;
});

export { Or };
