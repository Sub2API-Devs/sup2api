/**
 * highlight.js/lib/languages/wren.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:530928-533165 cjs-fingerprint
var ac = x(function (Rb, nc) {
  function d_(e) {
    let regex = e.regex,
      n = /[a-zA-Z]\w*/,
      a = [
        "as",
        "break",
        "class",
        "construct",
        "continue",
        "else",
        "for",
        "foreign",
        "if",
        "import",
        "in",
        "is",
        "return",
        "static",
        "var",
        "while",
      ],
      s = ["true", "false", "null"],
      o = ["this", "super"],
      r = [
        "Bool",
        "Class",
        "Fiber",
        "Fn",
        "List",
        "Map",
        "Null",
        "Num",
        "Object",
        "Range",
        "Sequence",
        "String",
        "System",
      ],
      i = [
        "-",
        "~",
        /\*/,
        "%",
        /\.\.\./,
        /\.\./,
        /\+/,
        "<<",
        ">>",
        ">=",
        "<=",
        "<",
        ">",
        /\^/,
        /!=/,
        /!/,
        /\bis\b/,
        "==",
        "&&",
        "&",
        /\|\|/,
        /\|/,
        /\?:/,
        "=",
      ],
      c = {
        relevance: 0,
        match: regex.concat(/\b(?!(if|while|for|else|super)\b)/, n, /(?=\s*[({])/),
        className: "title.function",
      },
      l = {
        match: regex.concat(
          regex.either(regex.concat(/\b(?!(if|while|for|else|super)\b)/, n), regex.either(...i)),
          /(?=\s*\([^)]+\)\s*\{)/,
        ),
        className: "title.function",
        starts: {
          contains: [{ begin: /\(/, end: /\)/, contains: [{ relevance: 0, scope: "params", match: n }] }],
        },
      },
      d = {
        variants: [{ match: [/class\s+/, n, /\s+is\s+/, n] }, { match: [/class\s+/, n] }],
        scope: { 2: "title.class", 4: "title.class.inherited" },
        keywords: a,
      },
      m = { relevance: 0, match: regex.either(...i), className: "operator" },
      p = { className: "string", begin: /"""/, end: /"""/ },
      _ = {
        className: "property",
        begin: regex.concat(/\./, regex.lookahead(n)),
        end: n,
        excludeBegin: !0,
        relevance: 0,
      },
      E = { relevance: 0, match: regex.concat(/\b_/, n), scope: "variable" },
      u = { relevance: 0, match: /\b[A-Z]+[a-z]+([A-Z]+[a-z]+)*/, scope: "title.class", keywords: { _: r } },
      C_NUMBER_MODE = e.C_NUMBER_MODE,
      f = {
        match: [n, /\s*/, /=/, /\s*/, /\(/, n, /\)\s*\{/],
        scope: { 1: "title.function", 3: "operator", 6: "params" },
      },
      COMMENT = e.COMMENT(/\/\*\*/, /\*\//, { contains: [{ match: /@[a-z]+/, scope: "doctag" }, "self"] }),
      S = { scope: "subst", begin: /%\(/, end: /\)/, contains: [C_NUMBER_MODE, u, c, E, m] },
      N = {
        scope: "string",
        begin: /"/,
        end: /"/,
        contains: [
          S,
          {
            scope: "char.escape",
            variants: [
              { match: /\\\\|\\["0%abefnrtv]/ },
              { match: /\\x[0-9A-F]{2}/ },
              { match: /\\u[0-9A-F]{4}/ },
              { match: /\\U[0-9A-F]{8}/ },
            ],
          },
        ],
      };
    S.contains.push(N);
    let A = [...a, ...o, ...s],
      C = {
        relevance: 0,
        match: regex.concat("\\b(?!", A.join("|"), "\\b)", /[a-zA-Z_]\w*(?:[?!]|\b)/),
        className: "variable",
      };
    return {
      name: "Wren",
      keywords: { keyword: a, "variable.language": o, literal: s },
      contains: [
        {
          scope: "comment",
          variants: [
            {
              begin: [/#!?/, /[A-Za-z_]+(?=\()/],
              beginScope: {},
              keywords: { literal: s },
              contains: [],
              end: /\)/,
            },
            { begin: [/#!?/, /[A-Za-z_]+/], beginScope: {}, end: /$/ },
          ],
        },
        C_NUMBER_MODE,
        N,
        p,
        COMMENT,
        e.C_LINE_COMMENT_MODE,
        e.C_BLOCK_COMMENT_MODE,
        u,
        d,
        f,
        l,
        c,
        m,
        E,
        _,
        C,
      ],
    };
  }
  nc.exports = d_;
});

export { ac };
