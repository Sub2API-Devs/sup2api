/**
 * highlight.js/lib/languages/actionscript.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:1742-3199 cjs-fingerprint
var require_actionscript = x(function (cjsExports, cjsModule) {
  function actionscript(hljs) {
    let regex = hljs.regex;
    let IDENT_RE = /[a-zA-Z_$][a-zA-Z0-9_$]*/;
    let PKG_NAME_RE = regex.concat(IDENT_RE, regex.concat("(\\.", IDENT_RE, ")*"));
    let IDENT_FUNC_RETURN_TYPE_RE = /([*]|[a-zA-Z_$][a-zA-Z0-9_$]*)/;
    let AS3_REST_ARG_MODE = {
      className: "rest_arg",
      begin: /[.]{3}/,
      end: IDENT_RE,
      relevance: 10,
    };
    return {
      name: "ActionScript",
      aliases: ["as"],
      keywords: {
        keyword: [
          "as",
          "break",
          "case",
          "catch",
          "class",
          "const",
          "continue",
          "default",
          "delete",
          "do",
          "dynamic",
          "each",
          "else",
          "extends",
          "final",
          "finally",
          "for",
          "function",
          "get",
          "if",
          "implements",
          "import",
          "in",
          "include",
          "instanceof",
          "interface",
          "internal",
          "is",
          "namespace",
          "native",
          "new",
          "override",
          "package",
          "private",
          "protected",
          "public",
          "return",
          "set",
          "static",
          "super",
          "switch",
          "this",
          "throw",
          "try",
          "typeof",
          "use",
          "var",
          "void",
          "while",
          "with",
        ],
        literal: ["true", "false", "null", "undefined"],
      },
      contains: [
        hljs.APOS_STRING_MODE,
        hljs.QUOTE_STRING_MODE,
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        hljs.C_NUMBER_MODE,
        {
          match: [/\bpackage/, /\s+/, PKG_NAME_RE],
          className: {
            1: "keyword",
            3: "title.class",
          },
        },
        {
          match: [/\b(?:class|interface|extends|implements)/, /\s+/, IDENT_RE],
          className: {
            1: "keyword",
            3: "title.class",
          },
        },
        {
          className: "meta",
          beginKeywords: "import include",
          end: /;/,
          keywords: {
            keyword: "import include",
          },
        },
        {
          beginKeywords: "function",
          end: /[{;]/,
          excludeEnd: true,
          illegal: /\S/,
          contains: [
            hljs.inherit(hljs.TITLE_MODE, {
              className: "title.function",
            }),
            {
              className: "params",
              begin: /\(/,
              end: /\)/,
              contains: [
                hljs.APOS_STRING_MODE,
                hljs.QUOTE_STRING_MODE,
                hljs.C_LINE_COMMENT_MODE,
                hljs.C_BLOCK_COMMENT_MODE,
                AS3_REST_ARG_MODE,
              ],
            },
            {
              begin: regex.concat(/:\s*/, IDENT_FUNC_RETURN_TYPE_RE),
            },
          ],
        },
        hljs.METHOD_GUARD,
      ],
      illegal: /#/,
    };
  }
  cjsModule.exports = actionscript;
});
export { require_actionscript };
