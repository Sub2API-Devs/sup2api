/**
 * highlight.js/lib/languages/cal.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:61419-62603 cjs-fingerprint
var $t = x(function (yu, Ht) {
  function pl(e) {
    let regex = e.regex,
      n = [
        "div",
        "mod",
        "in",
        "and",
        "or",
        "not",
        "xor",
        "asserterror",
        "begin",
        "case",
        "do",
        "downto",
        "else",
        "end",
        "exit",
        "for",
        "local",
        "if",
        "of",
        "repeat",
        "then",
        "to",
        "until",
        "while",
        "with",
        "var",
      ],
      a = "false true",
      s = [
        e.C_LINE_COMMENT_MODE,
        e.COMMENT(/\{/, /\}/, { relevance: 0 }),
        e.COMMENT(/\(\*/, /\*\)/, { relevance: 10 }),
      ],
      o = { className: "string", begin: /'/, end: /'/, contains: [{ begin: /''/ }] },
      r = { className: "string", begin: /(#\d+)+/ },
      i = { className: "number", begin: "\\b\\d+(\\.\\d+)?(DT|D|T)", relevance: 0 },
      c = { className: "string", begin: '"', end: '"' },
      l = {
        match: [/procedure/, /\s+/, /[a-zA-Z_][\w@]*/, /\s*/],
        scope: { 1: "keyword", 3: "title.function" },
        contains: [
          { className: "params", begin: /\(/, end: /\)/, keywords: n, contains: [o, r, e.NUMBER_MODE] },
          ...s,
        ],
      },
      d = ["Table", "Form", "Report", "Dataport", "Codeunit", "XMLport", "MenuSuite", "Page", "Query"],
      m = {
        match: [/OBJECT/, /\s+/, regex.either(...d), /\s+/, /\d+/, /\s+(?=[^\s])/, /.*/, /$/],
        relevance: 3,
        scope: { 1: "keyword", 3: "type", 5: "number", 7: "title" },
      };
    return {
      name: "C/AL",
      case_insensitive: !0,
      keywords: { keyword: n, literal: "false true" },
      illegal: /\/\*/,
      contains: [{ match: /[\w]+(?=\=)/, scope: "attribute", relevance: 0 }, o, r, i, c, e.NUMBER_MODE, m, l],
    };
  }
  Ht.exports = pl;
});

export { $t };
