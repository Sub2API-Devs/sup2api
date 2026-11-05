/**
 * highlight.js/lib/languages/dart.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:113039-115280 cjs-fingerprint
var require_dart = __commonJS(function (cjsExports, cjsModule) {
  function dart(hljs) {
    let SUBST = {
      className: "subst",
      variants: [
        {
          begin: "\\$[A-Za-z0-9_]+",
        },
      ],
    };
    let BRACED_SUBST = {
      className: "subst",
      variants: [
        {
          begin: /\$\{/,
          end: /\}/,
        },
      ],
      keywords: "true false null this is new super",
    };
    let NUMBER = {
      className: "number",
      relevance: 0,
      variants: [
        {
          match: /\b[0-9][0-9_]*(\.[0-9][0-9_]*)?([eE][+-]?[0-9][0-9_]*)?\b/,
        },
        {
          match: /\b0[xX][0-9A-Fa-f][0-9A-Fa-f_]*\b/,
        },
      ],
    };
    let STRING = {
      className: "string",
      variants: [
        {
          begin: "r'''",
          end: "'''",
        },
        {
          begin: 'r"""',
          end: '"""',
        },
        {
          begin: "r'",
          end: "'",
          illegal: "\\n",
        },
        {
          begin: 'r"',
          end: '"',
          illegal: "\\n",
        },
        {
          begin: "'''",
          end: "'''",
          contains: [hljs.BACKSLASH_ESCAPE, SUBST, BRACED_SUBST],
        },
        {
          begin: '"""',
          end: '"""',
          contains: [hljs.BACKSLASH_ESCAPE, SUBST, BRACED_SUBST],
        },
        {
          begin: "'",
          end: "'",
          illegal: "\\n",
          contains: [hljs.BACKSLASH_ESCAPE, SUBST, BRACED_SUBST],
        },
        {
          begin: '"',
          end: '"',
          illegal: "\\n",
          contains: [hljs.BACKSLASH_ESCAPE, SUBST, BRACED_SUBST],
        },
      ],
    };
    BRACED_SUBST.contains = [NUMBER, STRING];
    let BUILT_IN_TYPES = [
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
    ];
    let NULLABLE_BUILT_IN_TYPES = BUILT_IN_TYPES.map((e) => `${e}?`);
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
        built_in: BUILT_IN_TYPES.concat(NULLABLE_BUILT_IN_TYPES).concat([
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
        STRING,
        hljs.COMMENT(/\/\*\*(?!\/)/, /\*\//, {
          subLanguage: "markdown",
          relevance: 0,
        }),
        hljs.COMMENT(/\/{3,} ?/, /$/, {
          contains: [
            {
              subLanguage: "markdown",
              begin: ".",
              end: "$",
              relevance: 0,
            },
          ],
        }),
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        {
          className: "class",
          beginKeywords: "class interface",
          end: /\{/,
          excludeEnd: true,
          contains: [
            {
              beginKeywords: "extends implements",
            },
            hljs.UNDERSCORE_TITLE_MODE,
          ],
        },
        NUMBER,
        {
          className: "meta",
          begin: "@[A-Za-z]+",
        },
        {
          begin: "=>",
        },
      ],
    };
  }
  cjsModule.exports = dart;
});
export { require_dart };
