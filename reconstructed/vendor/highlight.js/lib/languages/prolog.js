/**
 * highlight.js/lib/languages/prolog.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:372714-373395 cjs-fingerprint
var Ji = x(function (yg, Qi) {
  function Kp(e) {
    let t = { begin: /[a-z][A-Za-z0-9_]*/, relevance: 0 },
      n = {
        className: "symbol",
        variants: [{ begin: /[A-Z][a-zA-Z0-9_]*/ }, { begin: /_[A-Za-z0-9_]*/ }],
        relevance: 0,
      },
      a = { begin: /\(/, end: /\)/, relevance: 0 },
      s = { begin: /\[/, end: /\]/ },
      o = { className: "comment", begin: /%/, end: /$/, contains: [e.PHRASAL_WORDS_MODE] },
      r = { className: "string", begin: /`/, end: /`/, contains: [e.BACKSLASH_ESCAPE] },
      i = { className: "string", begin: /0'(\\'|.)/ },
      c = { className: "string", begin: /0'\\s/ },
      d = [
        t,
        n,
        a,
        { begin: /:-/ },
        s,
        o,
        e.C_BLOCK_COMMENT_MODE,
        e.QUOTE_STRING_MODE,
        e.APOS_STRING_MODE,
        r,
        i,
        c,
        e.C_NUMBER_MODE,
      ];
    return ((a.contains = d), (s.contains = d), { name: "Prolog", contains: d.concat([{ begin: /\.$/ }]) });
  }
  Qi.exports = Kp;
});

export { Ji };
