/**
 * highlight.js/lib/languages/groovy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:180972-182575 cjs-fingerprint
var require_groovy = x(function (cjsExports, cjsModule) {
  function variants(variants, obj = {}) {
    obj.variants = variants;
    return obj;
  }
  function groovy(hljs) {
    let regex = hljs.regex;
    let IDENT_RE = "[A-Za-z0-9_$]+";
    let COMMENT = variants([
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      hljs.COMMENT("/\\*\\*", "\\*/", {
        relevance: 0,
        contains: [
          {
            begin: /\w+@/,
            relevance: 0,
          },
          {
            className: "doctag",
            begin: "@[A-Za-z]+",
          },
        ],
      }),
    ]);
    let REGEXP = {
      className: "regexp",
      begin: /~?\/[^\/\n]+\//,
      contains: [hljs.BACKSLASH_ESCAPE],
    };
    let NUMBER = variants([hljs.BINARY_NUMBER_MODE, hljs.C_NUMBER_MODE]);
    let STRING = variants(
      [
        {
          begin: /"""/,
          end: /"""/,
        },
        {
          begin: /'''/,
          end: /'''/,
        },
        {
          begin: "\\$/",
          end: "/\\$",
          relevance: 10,
        },
        hljs.APOS_STRING_MODE,
        hljs.QUOTE_STRING_MODE,
      ],
      {
        className: "string",
      },
    );
    let CLASS_DEFINITION = {
      match: [/(class|interface|trait|enum|record|extends|implements)/, /\s+/, hljs.UNDERSCORE_IDENT_RE],
      scope: {
        1: "keyword",
        3: "title.class",
      },
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
        hljs.SHEBANG({
          binary: "groovy",
          relevance: 10,
        }),
        COMMENT,
        STRING,
        REGEXP,
        NUMBER,
        CLASS_DEFINITION,
        {
          className: "meta",
          begin: "@[A-Za-z]+",
          relevance: 0,
        },
        {
          className: "attr",
          begin: "[A-Za-z0-9_$]+[ \t]*:",
          relevance: 0,
        },
        {
          begin: /\?/,
          end: /:/,
          relevance: 0,
          contains: [COMMENT, STRING, REGEXP, NUMBER, "self"],
        },
        {
          className: "symbol",
          begin: "^[ \t]*" + regex.lookahead("[A-Za-z0-9_$]+:"),
          excludeBegin: true,
          end: "[A-Za-z0-9_$]+:",
          relevance: 0,
        },
      ],
      illegal: /#|<\//,
    };
  }
  cjsModule.exports = groovy;
});
export { require_groovy };
