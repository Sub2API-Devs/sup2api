/**
 * highlight.js/lib/languages/ceylon.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:63380-64611 cjs-fingerprint
var require_ceylon = __commonJS(function (cjsExports, cjsModule) {
  function ceylon(hljs) {
    let KEYWORDS = [
      "assembly",
      "module",
      "package",
      "import",
      "alias",
      "class",
      "interface",
      "object",
      "given",
      "value",
      "assign",
      "void",
      "function",
      "new",
      "of",
      "extends",
      "satisfies",
      "abstracts",
      "in",
      "out",
      "return",
      "break",
      "continue",
      "throw",
      "assert",
      "dynamic",
      "if",
      "else",
      "switch",
      "case",
      "for",
      "while",
      "try",
      "catch",
      "finally",
      "then",
      "let",
      "this",
      "outer",
      "super",
      "is",
      "exists",
      "nonempty",
    ];
    let DECLARATION_MODIFIERS = [
      "shared",
      "abstract",
      "formal",
      "default",
      "actual",
      "variable",
      "late",
      "native",
      "deprecated",
      "final",
      "sealed",
      "annotation",
      "suppressWarnings",
      "small",
    ];
    let DOCUMENTATION = ["doc", "by", "license", "see", "throws", "tagged"];
    let SUBST = {
      className: "subst",
      excludeBegin: true,
      excludeEnd: true,
      begin: /``/,
      end: /``/,
      keywords: KEYWORDS,
      relevance: 10,
    };
    let EXPRESSIONS = [
      {
        className: "string",
        begin: '"""',
        end: '"""',
        relevance: 10,
      },
      {
        className: "string",
        begin: '"',
        end: '"',
        contains: [SUBST],
      },
      {
        className: "string",
        begin: "'",
        end: "'",
      },
      {
        className: "number",
        begin: "#[0-9a-fA-F_]+|\\$[01_]+|[0-9_]+(?:\\.[0-9_](?:[eE][+-]?\\d+)?)?[kMGTPmunpf]?",
        relevance: 0,
      },
    ];
    SUBST.contains = EXPRESSIONS;
    return {
      name: "Ceylon",
      keywords: {
        keyword: KEYWORDS.concat(DECLARATION_MODIFIERS),
        meta: DOCUMENTATION,
      },
      illegal: "\\$[^01]|#[^0-9a-fA-F]",
      contains: [
        hljs.C_LINE_COMMENT_MODE,
        hljs.COMMENT("/\\*", "\\*/", {
          contains: ["self"],
        }),
        {
          className: "meta",
          begin: '@[a-z]\\w*(?::"[^"]*")?',
        },
      ].concat(EXPRESSIONS),
    };
  }
  cjsModule.exports = ceylon;
});
export { require_ceylon };
