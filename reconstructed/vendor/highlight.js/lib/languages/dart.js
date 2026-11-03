/**
 * highlight.js/lib/languages/dart.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:113039-115280 cjs-fingerprint
var On = x(function (Ku, Rn) {
  function Hl(e) {
    let t = { className: "subst", variants: [{ begin: "\\$[A-Za-z0-9_]+" }] },
      n = {
        className: "subst",
        variants: [{ begin: /\$\{/, end: /\}/ }],
        keywords: "true false null this is new super",
      },
      a = {
        className: "number",
        relevance: 0,
        variants: [
          { match: /\b[0-9][0-9_]*(\.[0-9][0-9_]*)?([eE][+-]?[0-9][0-9_]*)?\b/ },
          { match: /\b0[xX][0-9A-Fa-f][0-9A-Fa-f_]*\b/ },
        ],
      },
      s = {
        className: "string",
        variants: [
          { begin: "r'''", end: "'''" },
          { begin: 'r"""', end: '"""' },
          { begin: "r'", end: "'", illegal: "\\n" },
          { begin: 'r"', end: '"', illegal: "\\n" },
          { begin: "'''", end: "'''", contains: [e.BACKSLASH_ESCAPE, t, n] },
          { begin: '"""', end: '"""', contains: [e.BACKSLASH_ESCAPE, t, n] },
          { begin: "'", end: "'", illegal: "\\n", contains: [e.BACKSLASH_ESCAPE, t, n] },
          { begin: '"', end: '"', illegal: "\\n", contains: [e.BACKSLASH_ESCAPE, t, n] },
        ],
      };
    n.contains = [a, s];
    let o = [
        "Comparable",
        "DateTime",
        "Duration",
        "Function",
        "Iterable",
        "Iterator",
        "List",
        "Map",
        "Match",
        "Object",
        "Pattern",
        "RegExp",
        "Set",
        "Stopwatch",
        "String",
        "StringBuffer",
        "StringSink",
        "Symbol",
        "Type",
        "Uri",
        "bool",
        "double",
        "int",
        "num",
        "Element",
        "ElementList",
      ],
      mapped = o.map((l) => `${l}?`);
    return {
      name: "Dart",
      keywords: {
        keyword: [
          "abstract",
          "as",
          "assert",
          "async",
          "await",
          "base",
          "break",
          "case",
          "catch",
          "class",
          "const",
          "continue",
          "covariant",
          "default",
          "deferred",
          "do",
          "dynamic",
          "else",
          "enum",
          "export",
          "extends",
          "extension",
          "external",
          "factory",
          "false",
          "final",
          "finally",
          "for",
          "Function",
          "get",
          "hide",
          "if",
          "implements",
          "import",
          "in",
          "interface",
          "is",
          "late",
          "library",
          "mixin",
          "new",
          "null",
          "on",
          "operator",
          "part",
          "required",
          "rethrow",
          "return",
          "sealed",
          "set",
          "show",
          "static",
          "super",
          "switch",
          "sync",
          "this",
          "throw",
          "true",
          "try",
          "typedef",
          "var",
          "void",
          "when",
          "while",
          "with",
          "yield",
        ],
        built_in: o
          .concat(mapped)
          .concat([
            "Never",
            "Null",
            "dynamic",
            "print",
            "document",
            "querySelector",
            "querySelectorAll",
            "window",
          ]),
        $pattern: /[A-Za-z][A-Za-z0-9_]*\??/,
      },
      contains: [
        s,
        e.COMMENT(/\/\*\*(?!\/)/, /\*\//, { subLanguage: "markdown", relevance: 0 }),
        e.COMMENT(/\/{3,} ?/, /$/, {
          contains: [{ subLanguage: "markdown", begin: ".", end: "$", relevance: 0 }],
        }),
        e.C_LINE_COMMENT_MODE,
        e.C_BLOCK_COMMENT_MODE,
        {
          className: "class",
          beginKeywords: "class interface",
          end: /\{/,
          excludeEnd: !0,
          contains: [{ beginKeywords: "extends implements" }, e.UNDERSCORE_TITLE_MODE],
        },
        a,
        { className: "meta", begin: "@[A-Za-z]+" },
        { begin: "=>" },
      ],
    };
  }
  Rn.exports = Hl;
});

export { On };
