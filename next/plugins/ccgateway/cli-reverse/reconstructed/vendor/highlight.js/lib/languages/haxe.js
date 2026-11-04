/**
 * highlight.js/lib/languages/haxe.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:188089-190267 cjs-fingerprint
var require_haxe = __commonJS(function (cjsExports, cjsModule) {
  function haxe(hljs) {
    let HAXE_NUMBER_RE =
      /(-?)(\b0[xX][a-fA-F0-9_]+|(\b\d+(\.[\d_]*)?|\.[\d_]+)(([eE][-+]?\d+)|i32|u32|i64|f64)?)/;
    let HAXE_BASIC_TYPES = "Int Float String Bool Dynamic Void Array ";
    return {
      name: "Haxe",
      aliases: ["hx"],
      keywords: {
        keyword:
          "abstract break case cast catch continue default do dynamic else enum extern final for function here if import in inline is macro never new override package private get set public return static super switch this throw trace try typedef untyped using var while Int Float String Bool Dynamic Void Array ",
        built_in: "trace this",
        literal: "true false null _",
      },
      contains: [
        {
          className: "string",
          begin: "'",
          end: "'",
          contains: [
            hljs.BACKSLASH_ESCAPE,
            {
              className: "subst",
              begin: /\$\{/,
              end: /\}/,
            },
            {
              className: "subst",
              begin: /\$/,
              end: /\W\}/,
            },
          ],
        },
        hljs.QUOTE_STRING_MODE,
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        {
          className: "number",
          begin: HAXE_NUMBER_RE,
          relevance: 0,
        },
        {
          className: "variable",
          begin: "\\$[a-zA-Z_$][a-zA-Z0-9_$]*",
        },
        {
          className: "meta",
          begin: /@:?/,
          end: /\(|$/,
          excludeEnd: true,
        },
        {
          className: "meta",
          begin: "#",
          end: "$",
          keywords: {
            keyword: "if else elseif end error",
          },
        },
        {
          className: "type",
          begin: /:[ \t]*/,
          end: /[^A-Za-z0-9_ \t\->]/,
          excludeBegin: true,
          excludeEnd: true,
          relevance: 0,
        },
        {
          className: "type",
          begin: /:[ \t]*/,
          end: /\W/,
          excludeBegin: true,
          excludeEnd: true,
        },
        {
          className: "type",
          beginKeywords: "new",
          end: /\W/,
          excludeBegin: true,
          excludeEnd: true,
        },
        {
          className: "title.class",
          beginKeywords: "enum",
          end: /\{/,
          contains: [hljs.TITLE_MODE],
        },
        {
          className: "title.class",
          begin: "\\babstract\\b(?=\\s*" + hljs.IDENT_RE + "\\s*\\()",
          end: /[\{$]/,
          contains: [
            {
              className: "type",
              begin: /\(/,
              end: /\)/,
              excludeBegin: true,
              excludeEnd: true,
            },
            {
              className: "type",
              begin: /from +/,
              end: /\W/,
              excludeBegin: true,
              excludeEnd: true,
            },
            {
              className: "type",
              begin: /to +/,
              end: /\W/,
              excludeBegin: true,
              excludeEnd: true,
            },
            hljs.TITLE_MODE,
          ],
          keywords: {
            keyword: "abstract from to",
          },
        },
        {
          className: "title.class",
          begin: /\b(class|interface) +/,
          end: /[\{$]/,
          excludeEnd: true,
          keywords: "class interface",
          contains: [
            {
              className: "keyword",
              begin: /\b(extends|implements) +/,
              keywords: "extends implements",
              contains: [
                {
                  className: "type",
                  begin: hljs.IDENT_RE,
                  relevance: 0,
                },
              ],
            },
            hljs.TITLE_MODE,
          ],
        },
        {
          className: "title.function",
          beginKeywords: "function",
          end: /\(/,
          excludeEnd: true,
          illegal: /\S/,
          contains: [hljs.TITLE_MODE],
        },
      ],
      illegal: /<\//,
    };
  }
  cjsModule.exports = haxe;
});
export { require_haxe };
