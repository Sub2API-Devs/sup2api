/**
 * highlight.js/lib/languages/groovy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:180972-182575 cjs-fingerprint
var Da = x(function (SE, Ma) {
  function qe(e, t = {}) {
    return ((t.variants = e), t);
  }
  function Nd(e) {
    let regex = e.regex,
      n = "[A-Za-z0-9_$]+",
      a = qe([
        e.C_LINE_COMMENT_MODE,
        e.C_BLOCK_COMMENT_MODE,
        e.COMMENT("/\\*\\*", "\\*/", {
          relevance: 0,
          contains: [
            { begin: /\w+@/, relevance: 0 },
            { className: "doctag", begin: "@[A-Za-z]+" },
          ],
        }),
      ]),
      s = { className: "regexp", begin: /~?\/[^\/\n]+\//, contains: [e.BACKSLASH_ESCAPE] },
      o = qe([e.BINARY_NUMBER_MODE, e.C_NUMBER_MODE]),
      r = qe(
        [
          { begin: /"""/, end: /"""/ },
          { begin: /'''/, end: /'''/ },
          { begin: "\\$/", end: "/\\$", relevance: 10 },
          e.APOS_STRING_MODE,
          e.QUOTE_STRING_MODE,
        ],
        { className: "string" },
      ),
      i = {
        match: [/(class|interface|trait|enum|record|extends|implements)/, /\s+/, e.UNDERSCORE_IDENT_RE],
        scope: { 1: "keyword", 3: "title.class" },
      };
    return {
      name: "Groovy",
      keywords: {
        "variable.language": "this super",
        literal: "true false null",
        type: ["byte", "short", "char", "int", "long", "boolean", "float", "double", "void"],
        keyword: [
          "def",
          "as",
          "in",
          "assert",
          "trait",
          "abstract",
          "static",
          "volatile",
          "transient",
          "public",
          "private",
          "protected",
          "synchronized",
          "final",
          "class",
          "interface",
          "enum",
          "if",
          "else",
          "for",
          "while",
          "switch",
          "case",
          "break",
          "default",
          "continue",
          "throw",
          "throws",
          "try",
          "catch",
          "finally",
          "implements",
          "extends",
          "new",
          "import",
          "package",
          "return",
          "instanceof",
          "var",
        ],
      },
      contains: [
        e.SHEBANG({ binary: "groovy", relevance: 10 }),
        a,
        r,
        s,
        o,
        i,
        { className: "meta", begin: "@[A-Za-z]+", relevance: 0 },
        { className: "attr", begin: "[A-Za-z0-9_$]+[ \t]*:", relevance: 0 },
        { begin: /\?/, end: /:/, relevance: 0, contains: [a, r, s, o, "self"] },
        {
          className: "symbol",
          begin: "^[ \t]*" + regex.lookahead("[A-Za-z0-9_$]+:"),
          excludeBegin: !0,
          end: "[A-Za-z0-9_$]+:",
          relevance: 0,
        },
      ],
      illegal: /#|<\//,
    };
  }
  Ma.exports = Nd;
});

export { Da };
