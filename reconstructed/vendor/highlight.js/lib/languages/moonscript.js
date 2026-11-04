/**
 * highlight.js/lib/languages/moonscript.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:303563-305312 cjs-fingerprint
var require_moonscript = __commonJS(function (cjsExports, cjsModule) {
  function moonscript(hljs) {
    let KEYWORDS = {
      keyword:
        "if then not for in while do return else elseif break continue switch and or unless when class extends super local import export from using",
      literal: "true false nil",
      built_in:
        "_G _VERSION assert collectgarbage dofile error getfenv getmetatable ipairs load loadfile loadstring module next pairs pcall print rawequal rawget rawset require select setfenv setmetatable tonumber tostring type unpack xpcall coroutine debug io math os package string table",
    };
    let JS_IDENT_RE = "[A-Za-z$_][0-9A-Za-z$_]*";
    let SUBST = {
      className: "subst",
      begin: /#\{/,
      end: /\}/,
      keywords: KEYWORDS,
    };
    let EXPRESSIONS = [
      hljs.inherit(hljs.C_NUMBER_MODE, {
        starts: {
          end: "(\\s*/)?",
          relevance: 0,
        },
      }),
      {
        className: "string",
        variants: [
          {
            begin: /'/,
            end: /'/,
            contains: [hljs.BACKSLASH_ESCAPE],
          },
          {
            begin: /"/,
            end: /"/,
            contains: [hljs.BACKSLASH_ESCAPE, SUBST],
          },
        ],
      },
      {
        className: "built_in",
        begin: "@__" + hljs.IDENT_RE,
      },
      {
        begin: "@" + hljs.IDENT_RE,
      },
      {
        begin: hljs.IDENT_RE + "\\\\" + hljs.IDENT_RE,
      },
    ];
    SUBST.contains = EXPRESSIONS;
    let TITLE = hljs.inherit(hljs.TITLE_MODE, {
      begin: "[A-Za-z$_][0-9A-Za-z$_]*",
    });
    let POSSIBLE_PARAMS_RE = "(\\(.*\\)\\s*)?\\B[-=]>";
    let PARAMS = {
      className: "params",
      begin: "\\([^\\(]",
      returnBegin: true,
      contains: [
        {
          begin: /\(/,
          end: /\)/,
          keywords: KEYWORDS,
          contains: ["self"].concat(EXPRESSIONS),
        },
      ],
    };
    return {
      name: "MoonScript",
      aliases: ["moon"],
      keywords: KEYWORDS,
      illegal: /\/\*/,
      contains: EXPRESSIONS.concat([
        hljs.COMMENT("--", "$"),
        {
          className: "function",
          begin: "^\\s*[A-Za-z$_][0-9A-Za-z$_]*\\s*=\\s*" + POSSIBLE_PARAMS_RE,
          end: "[-=]>",
          returnBegin: true,
          contains: [TITLE, PARAMS],
        },
        {
          begin: /[\(,:=]\s*/,
          relevance: 0,
          contains: [
            {
              className: "function",
              begin: POSSIBLE_PARAMS_RE,
              end: "[-=]>",
              returnBegin: true,
              contains: [PARAMS],
            },
          ],
        },
        {
          className: "class",
          beginKeywords: "class",
          end: "$",
          illegal: /[:="\[\]]/,
          contains: [
            {
              beginKeywords: "extends",
              endsWithParent: true,
              illegal: /[:="\[\]]/,
              contains: [TITLE],
            },
            TITLE,
          ],
        },
        {
          className: "name",
          begin: "[A-Za-z$_][0-9A-Za-z$_]*:",
          end: ":",
          returnBegin: true,
          returnEnd: true,
          relevance: 0,
        },
      ]),
    };
  }
  cjsModule.exports = moonscript;
});
export { require_moonscript };
