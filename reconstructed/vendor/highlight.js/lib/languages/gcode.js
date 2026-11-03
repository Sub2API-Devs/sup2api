/**
 * highlight.js/lib/languages/gcode.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:166152-167477 cjs-fingerprint
var ba = x(function (uE, ga) {
  function _d(e) {
    let regex = e.regex,
      n = {
        $pattern: /[A-Z]+|%/,
        keyword: [
          "THEN",
          "ELSE",
          "ENDIF",
          "IF",
          "GOTO",
          "DO",
          "WHILE",
          "WH",
          "END",
          "CALL",
          "SUB",
          "ENDSUB",
          "EQ",
          "NE",
          "LT",
          "GT",
          "LE",
          "GE",
          "AND",
          "OR",
          "XOR",
          "%",
        ],
        built_in: [
          "ATAN",
          "ABS",
          "ACOS",
          "ASIN",
          "COS",
          "EXP",
          "FIX",
          "FUP",
          "ROUND",
          "LN",
          "SIN",
          "SQRT",
          "TAN",
          "EXISTS",
        ],
      },
      a = /\b/;
    function s(_, E) {
      if (_.index === 0) return;
      let u = _.input[_.index - 1];
      if (u >= "0" && u <= "9") return;
      if (u === "_") return;
      E.ignoreMatch();
    }
    let o = /[+-]?((\.\d+)|(\d+)(\.\d*)?)/,
      r = /[GM]\s*\d+(\.\d+)?/,
      i = /T\s*\d+/,
      c = /O\s*\d+/,
      l = /O<.+>/,
      d = /[ABCUVWXYZ]\s*/,
      m = /[FHIJKPQRS]\s*/,
      p = [
        e.COMMENT(/\(/, /\)/),
        e.COMMENT(/;/, /$/),
        e.APOS_STRING_MODE,
        e.QUOTE_STRING_MODE,
        e.C_NUMBER_MODE,
        {
          scope: "title.function",
          variants: [
            { match: regex.concat(a, r) },
            { begin: r, "on:begin": s },
            { match: regex.concat(a, i) },
            { begin: i, "on:begin": s },
          ],
        },
        {
          scope: "symbol",
          variants: [
            { match: regex.concat(a, c) },
            { begin: c, "on:begin": s },
            { match: regex.concat(a, l) },
            { begin: l, "on:begin": s },
            { match: /\*\s*\d+\s*$/ },
          ],
        },
        { scope: "operator", match: /^N\s*\d+/ },
        { scope: "variable", match: /-?#\s*\d+/ },
        {
          scope: "property",
          variants: [{ match: regex.concat(a, d, o) }, { begin: regex.concat(d, o), "on:begin": s }],
        },
        {
          scope: "params",
          variants: [{ match: regex.concat(a, m, o) }, { begin: regex.concat(m, o), "on:begin": s }],
        },
      ];
    return {
      name: "G-code (ISO 6983)",
      aliases: ["nc"],
      case_insensitive: !0,
      disableAutodetect: !0,
      keywords: n,
      contains: p,
    };
  }
  ga.exports = _d;
});

export { ba };
