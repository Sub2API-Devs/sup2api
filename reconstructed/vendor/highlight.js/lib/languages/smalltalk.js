/**
 * highlight.js/lib/languages/smalltalk.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:436855-437512 cjs-fingerprint
var Ys = x(function (jg, Ws) {
  function Om(e) {
    let n = { className: "string", begin: "\\$.{1}" },
      a = { className: "symbol", begin: "#" + e.UNDERSCORE_IDENT_RE };
    return {
      name: "Smalltalk",
      aliases: ["st"],
      keywords: ["self", "super", "nil", "true", "false", "thisContext"],
      contains: [
        e.COMMENT('"', '"'),
        e.APOS_STRING_MODE,
        { className: "type", begin: "\\b[A-Z][A-Za-z0-9_]*", relevance: 0 },
        { begin: "[a-z][a-zA-Z0-9_]*:", relevance: 0 },
        e.C_NUMBER_MODE,
        a,
        n,
        {
          begin: "\\|[ ]*[a-z][a-zA-Z0-9_]*([ ]+[a-z][a-zA-Z0-9_]*)*[ ]*\\|",
          returnBegin: !0,
          end: /\|/,
          illegal: /\S/,
          contains: [{ begin: "(\\|[ ]*)?[a-z][a-zA-Z0-9_]*" }],
        },
        { begin: "#\\(", end: "\\)", contains: [e.APOS_STRING_MODE, n, e.C_NUMBER_MODE, a] },
      ],
    };
  }
  Ws.exports = Om;
});

export { Ys };
