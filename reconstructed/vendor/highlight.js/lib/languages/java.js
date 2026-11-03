/**
 * highlight.js/lib/languages/java.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:203858-206900 cjs-fingerprint
var tr = x(function (LE, er) {
  var _e = "[0-9](_*[0-9])*",
    Ie = `\\.(${_e})`,
    Ce = "[0-9a-fA-F](_*[0-9a-fA-F])*",
    Ja = {
      className: "number",
      variants: [
        { begin: `(\\b(${_e})((${Ie})|\\.)?|(${Ie}))[eE][+-]?(${_e})[fFdD]?\\b` },
        { begin: `\\b(${_e})((${Ie})[fFdD]?\\b|\\.([fFdD]\\b)?)` },
        { begin: `(${Ie})[fFdD]?\\b` },
        { begin: `\\b(${_e})[fFdD]\\b` },
        { begin: `\\b0[xX]((${Ce})\\.?|(${Ce})?\\.(${Ce}))[pP][+-]?(${_e})[fFdD]?\\b` },
        { begin: "\\b(0|[1-9](_*[0-9])*)[lL]?\\b" },
        { begin: `\\b0[xX](${Ce})[lL]?\\b` },
        { begin: "\\b0(_*[0-7])*[lL]?\\b" },
        { begin: "\\b0[bB][01](_*[01])*[lL]?\\b" },
      ],
      relevance: 0,
    };
  function ja(e, t, n) {
    if (n === -1) return "";
    return e.replace(t, (a) => ja(e, t, n - 1));
  }
  function Dd(e) {
    let regex = e.regex,
      n = "[\xC0-\u02B8a-zA-Z_$][\xC0-\u02B8a-zA-Z_$0-9]*",
      a =
        "[\xC0-\u02B8a-zA-Z_$][\xC0-\u02B8a-zA-Z_$0-9]*" +
        ja(
          "(?:<" +
            "[\xC0-\u02B8a-zA-Z_$][\xC0-\u02B8a-zA-Z_$0-9]*" +
            "~~~(?:\\s*,\\s*" +
            "[\xC0-\u02B8a-zA-Z_$][\xC0-\u02B8a-zA-Z_$0-9]*" +
            "~~~)*>)?",
          /~~~/g,
          2,
        ),
      c = {
        keyword: [
          "synchronized",
          "abstract",
          "private",
          "var",
          "static",
          "if",
          "const ",
          "for",
          "while",
          "strictfp",
          "finally",
          "protected",
          "import",
          "native",
          "final",
          "void",
          "enum",
          "else",
          "break",
          "transient",
          "catch",
          "instanceof",
          "volatile",
          "case",
          "assert",
          "package",
          "default",
          "public",
          "try",
          "switch",
          "continue",
          "throws",
          "protected",
          "public",
          "private",
          "module",
          "requires",
          "exports",
          "do",
          "sealed",
          "yield",
          "permits",
          "goto",
          "when",
        ],
        literal: ["false", "true", "null"],
        type: ["char", "boolean", "long", "float", "int", "byte", "short", "double"],
        built_in: ["super", "this"],
      },
      l = {
        className: "meta",
        begin: "@" + "[\xC0-\u02B8a-zA-Z_$][\xC0-\u02B8a-zA-Z_$0-9]*",
        contains: [{ begin: /\(/, end: /\)/, contains: ["self"] }],
      },
      d = {
        className: "params",
        begin: /\(/,
        end: /\)/,
        keywords: c,
        relevance: 0,
        contains: [e.C_BLOCK_COMMENT_MODE],
        endsParent: !0,
      };
    return {
      name: "Java",
      aliases: ["jsp"],
      keywords: c,
      illegal: /<\/|#/,
      contains: [
        e.COMMENT("/\\*\\*", "\\*/", {
          relevance: 0,
          contains: [
            { begin: /\w+@/, relevance: 0 },
            { className: "doctag", begin: "@[A-Za-z]+" },
          ],
        }),
        { begin: /import java\.[a-z]+\./, keywords: "import", relevance: 2 },
        e.C_LINE_COMMENT_MODE,
        e.C_BLOCK_COMMENT_MODE,
        { begin: /"""/, end: /"""/, className: "string", contains: [e.BACKSLASH_ESCAPE] },
        e.APOS_STRING_MODE,
        e.QUOTE_STRING_MODE,
        {
          match: [
            /\b(?:class|interface|enum|extends|implements|new)/,
            /\s+/,
            "[\xC0-\u02B8a-zA-Z_$][\xC0-\u02B8a-zA-Z_$0-9]*",
          ],
          className: { 1: "keyword", 3: "title.class" },
        },
        { match: /non-sealed/, scope: "keyword" },
        {
          begin: [
            regex.concat(/(?!else)/, "[\xC0-\u02B8a-zA-Z_$][\xC0-\u02B8a-zA-Z_$0-9]*"),
            /\s+/,
            "[\xC0-\u02B8a-zA-Z_$][\xC0-\u02B8a-zA-Z_$0-9]*",
            /\s+/,
            /=(?!=)/,
          ],
          className: { 1: "type", 3: "variable", 5: "operator" },
        },
        {
          begin: [/record/, /\s+/, "[\xC0-\u02B8a-zA-Z_$][\xC0-\u02B8a-zA-Z_$0-9]*"],
          className: { 1: "keyword", 3: "title.class" },
          contains: [d, e.C_LINE_COMMENT_MODE, e.C_BLOCK_COMMENT_MODE],
        },
        { beginKeywords: "new throw return else", relevance: 0 },
        {
          begin: ["(?:" + a + "\\s+)", e.UNDERSCORE_IDENT_RE, /\s*(?=\()/],
          className: { 2: "title.function" },
          keywords: c,
          contains: [
            {
              className: "params",
              begin: /\(/,
              end: /\)/,
              keywords: c,
              relevance: 0,
              contains: [l, e.APOS_STRING_MODE, e.QUOTE_STRING_MODE, Ja, e.C_BLOCK_COMMENT_MODE],
            },
            e.C_LINE_COMMENT_MODE,
            e.C_BLOCK_COMMENT_MODE,
          ],
        },
        Ja,
        l,
      ],
    };
  }
  er.exports = Dd;
});

export { tr };
