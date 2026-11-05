/**
 * highlight.js/lib/languages/java.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:203858-206900 cjs-fingerprint
var require_java = __commonJS(function (cjsExports, cjsModule) {
  var decimalDigits = "[0-9](_*[0-9])*";
  var frac = `\\.(${decimalDigits})`;
  var hexDigits = "[0-9a-fA-F](_*[0-9a-fA-F])*";
  var NUMERIC = {
    className: "number",
    variants: [
      {
        begin: `(\\b(${decimalDigits})((${frac})|\\.)?|(${frac}))[eE][+-]?(${decimalDigits})[fFdD]?\\b`,
      },
      {
        begin: `\\b(${decimalDigits})((${frac})[fFdD]?\\b|\\.([fFdD]\\b)?)`,
      },
      {
        begin: `(${frac})[fFdD]?\\b`,
      },
      {
        begin: `\\b(${decimalDigits})[fFdD]\\b`,
      },
      {
        begin: `\\b0[xX]((${hexDigits})\\.?|(${hexDigits})?\\.(${hexDigits}))[pP][+-]?(${decimalDigits})[fFdD]?\\b`,
      },
      {
        begin: "\\b(0|[1-9](_*[0-9])*)[lL]?\\b",
      },
      {
        begin: `\\b0[xX](${hexDigits})[lL]?\\b`,
      },
      {
        begin: "\\b0(_*[0-7])*[lL]?\\b",
      },
      {
        begin: "\\b0[bB][01](_*[01])*[lL]?\\b",
      },
    ],
    relevance: 0,
  };
  function recurRegex(re, substitution, depth) {
    if (depth === -1) return "";
    return re.replace(substitution, (_) => recurRegex(re, substitution, depth - 1));
  }
  function java(hljs) {
    let regex = hljs.regex;
    let JAVA_IDENT_RE = "[\xC0-\u02B8a-zA-Z_$][\xC0-\u02B8a-zA-Z_$0-9]*";
    let GENERIC_IDENT_RE =
      "[\xC0-\u02B8a-zA-Z_$][\xC0-\u02B8a-zA-Z_$0-9]*" +
      recurRegex(
        "(?:<" +
          "[\xC0-\u02B8a-zA-Z_$][\xC0-\u02B8a-zA-Z_$0-9]*" +
          "~~~(?:\\s*,\\s*" +
          "[\xC0-\u02B8a-zA-Z_$][\xC0-\u02B8a-zA-Z_$0-9]*" +
          "~~~)*>)?",
        /~~~/g,
        2,
      );
    let KEYWORDS = {
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
    };
    let ANNOTATION = {
      className: "meta",
      begin: "@" + "[\xC0-\u02B8a-zA-Z_$][\xC0-\u02B8a-zA-Z_$0-9]*",
      contains: [
        {
          begin: /\(/,
          end: /\)/,
          contains: ["self"],
        },
      ],
    };
    let PARAMS = {
      className: "params",
      begin: /\(/,
      end: /\)/,
      keywords: KEYWORDS,
      relevance: 0,
      contains: [hljs.C_BLOCK_COMMENT_MODE],
      endsParent: true,
    };
    return {
      name: "Java",
      aliases: ["jsp"],
      keywords: KEYWORDS,
      illegal: /<\/|#/,
      contains: [
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
        {
          begin: /import java\.[a-z]+\./,
          keywords: "import",
          relevance: 2,
        },
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        {
          begin: /"""/,
          end: /"""/,
          className: "string",
          contains: [hljs.BACKSLASH_ESCAPE],
        },
        hljs.APOS_STRING_MODE,
        hljs.QUOTE_STRING_MODE,
        {
          match: [
            /\b(?:class|interface|enum|extends|implements|new)/,
            /\s+/,
            "[\xC0-\u02B8a-zA-Z_$][\xC0-\u02B8a-zA-Z_$0-9]*",
          ],
          className: {
            1: "keyword",
            3: "title.class",
          },
        },
        {
          match: /non-sealed/,
          scope: "keyword",
        },
        {
          begin: [
            regex.concat(/(?!else)/, "[\xC0-\u02B8a-zA-Z_$][\xC0-\u02B8a-zA-Z_$0-9]*"),
            /\s+/,
            "[\xC0-\u02B8a-zA-Z_$][\xC0-\u02B8a-zA-Z_$0-9]*",
            /\s+/,
            /=(?!=)/,
          ],
          className: {
            1: "type",
            3: "variable",
            5: "operator",
          },
        },
        {
          begin: [/record/, /\s+/, "[\xC0-\u02B8a-zA-Z_$][\xC0-\u02B8a-zA-Z_$0-9]*"],
          className: {
            1: "keyword",
            3: "title.class",
          },
          contains: [PARAMS, hljs.C_LINE_COMMENT_MODE, hljs.C_BLOCK_COMMENT_MODE],
        },
        {
          beginKeywords: "new throw return else",
          relevance: 0,
        },
        {
          begin: ["(?:" + GENERIC_IDENT_RE + "\\s+)", hljs.UNDERSCORE_IDENT_RE, /\s*(?=\()/],
          className: {
            2: "title.function",
          },
          keywords: KEYWORDS,
          contains: [
            {
              className: "params",
              begin: /\(/,
              end: /\)/,
              keywords: KEYWORDS,
              relevance: 0,
              contains: [
                ANNOTATION,
                hljs.APOS_STRING_MODE,
                hljs.QUOTE_STRING_MODE,
                NUMERIC,
                hljs.C_BLOCK_COMMENT_MODE,
              ],
            },
            hljs.C_LINE_COMMENT_MODE,
            hljs.C_BLOCK_COMMENT_MODE,
          ],
        },
        NUMERIC,
        ANNOTATION,
      ],
    };
  }
  cjsModule.exports = java;
});
export { require_java };
