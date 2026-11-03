/**
 * highlight.js/lib/languages/ceylon.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:63380-64611 cjs-fingerprint
var Wt = x(function (Mu, Vt) {
  function _l(e) {
    let t = [
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
      ],
      n = [
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
      ],
      a = ["doc", "by", "license", "see", "throws", "tagged"],
      s = {
        className: "subst",
        excludeBegin: !0,
        excludeEnd: !0,
        begin: /``/,
        end: /``/,
        keywords: t,
        relevance: 10,
      },
      o = [
        { className: "string", begin: '"""', end: '"""', relevance: 10 },
        { className: "string", begin: '"', end: '"', contains: [s] },
        { className: "string", begin: "'", end: "'" },
        {
          className: "number",
          begin: "#[0-9a-fA-F_]+|\\$[01_]+|[0-9_]+(?:\\.[0-9_](?:[eE][+-]?\\d+)?)?[kMGTPmunpf]?",
          relevance: 0,
        },
      ];
    return (
      (s.contains = o),
      {
        name: "Ceylon",
        keywords: { keyword: t.concat(n), meta: a },
        illegal: "\\$[^01]|#[^0-9a-fA-F]",
        contains: [
          e.C_LINE_COMMENT_MODE,
          e.COMMENT("/\\*", "\\*/", { contains: ["self"] }),
          { className: "meta", begin: '@[a-z]\\w*(?::"[^"]*")?' },
        ].concat(o),
      }
    );
  }
  Vt.exports = _l;
});

export { Wt };
