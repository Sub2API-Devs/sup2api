/**
 * highlight.js/lib/languages/lisp.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:244617-246122 cjs-fingerprint
var Mr = x(function (zE, hr) {
  function tp(e) {
    let s = { className: "literal", begin: "\\b(t{1}|nil)\\b" },
      o = {
        className: "number",
        variants: [
          { begin: "(-|\\+)?\\d+(\\.\\d+|\\/\\d+)?((d|e|f|l|s|D|E|F|L|S)(\\+|-)?\\d+)?", relevance: 0 },
          { begin: "#(b|B)[0-1]+(/[0-1]+)?" },
          { begin: "#(o|O)[0-7]+(/[0-7]+)?" },
          { begin: "#(x|X)[0-9a-fA-F]+(/[0-9a-fA-F]+)?" },
          {
            begin:
              "#(c|C)\\((-|\\+)?\\d+(\\.\\d+|\\/\\d+)?((d|e|f|l|s|D|E|F|L|S)(\\+|-)?\\d+)? +(-|\\+)?\\d+(\\.\\d+|\\/\\d+)?((d|e|f|l|s|D|E|F|L|S)(\\+|-)?\\d+)?",
            end: "\\)",
          },
        ],
      },
      inherit = e.inherit(e.QUOTE_STRING_MODE, { illegal: null }),
      COMMENT = e.COMMENT(";", "$", { relevance: 0 }),
      c = { begin: "\\*", end: "\\*" },
      l = { className: "symbol", begin: "[:&][a-zA-Z_\\-+\\*\\/<=>&#][a-zA-Z0-9_\\-+*\\/<=>&#!]*" },
      d = { begin: "[a-zA-Z_\\-+\\*\\/<=>&#][a-zA-Z0-9_\\-+*\\/<=>&#!]*", relevance: 0 },
      m = { begin: "\\|[^]*?\\|" },
      _ = {
        contains: [o, inherit, c, l, { begin: "\\(", end: "\\)", contains: ["self", s, inherit, o, d] }, d],
        variants: [
          { begin: "['`]\\(", end: "\\)" },
          { begin: "\\(quote ", end: "\\)", keywords: { name: "quote" } },
          { begin: "'\\|[^]*?\\|" },
        ],
      },
      E = {
        variants: [
          { begin: "'[a-zA-Z_\\-+\\*\\/<=>&#][a-zA-Z0-9_\\-+*\\/<=>&#!]*" },
          {
            begin:
              "#'[a-zA-Z_\\-+\\*\\/<=>&#][a-zA-Z0-9_\\-+*\\/<=>&#!]*(::[a-zA-Z_\\-+\\*\\/<=>&#][a-zA-Z0-9_\\-+*\\/<=>&#!]*)*",
          },
        ],
      },
      u = { begin: "\\(\\s*", end: "\\)" },
      b = { endsWithParent: !0, relevance: 0 };
    return (
      (u.contains = [
        {
          className: "name",
          variants: [
            { begin: "[a-zA-Z_\\-+\\*\\/<=>&#][a-zA-Z0-9_\\-+*\\/<=>&#!]*", relevance: 0 },
            { begin: "\\|[^]*?\\|" },
          ],
        },
        b,
      ]),
      (b.contains = [_, E, u, s, o, inherit, COMMENT, c, l, m, d]),
      { name: "Lisp", illegal: /\S/, contains: [o, e.SHEBANG(), s, inherit, COMMENT, _, E, u, d] }
    );
  }
  hr.exports = tp;
});

export { Mr };
