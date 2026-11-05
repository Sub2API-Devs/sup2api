/**
 * highlight.js/lib/languages/livescript.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:254323-258088 cjs-fingerprint
var require_livescript = __commonJS(function (cjsExports, cjsModule) {
  var KEYWORDS = [
    "as",
    "in",
    "of",
    "if",
    "for",
    "while",
    "finally",
    "var",
    "new",
    "function",
    "do",
    "return",
    "void",
    "else",
    "break",
    "catch",
    "instanceof",
    "with",
    "throw",
    "case",
    "default",
    "try",
    "switch",
    "continue",
    "typeof",
    "delete",
    "let",
    "yield",
    "const",
    "class",
    "debugger",
    "async",
    "await",
    "static",
    "import",
    "from",
    "export",
    "extends",
    "using",
  ];
  var LITERALS = ["true", "false", "null", "undefined", "NaN", "Infinity"];
  var TYPES = [
    "Object",
    "Function",
    "Boolean",
    "Symbol",
    "Math",
    "Date",
    "Number",
    "BigInt",
    "String",
    "RegExp",
    "Array",
    "Float32Array",
    "Float64Array",
    "Int8Array",
    "Uint8Array",
    "Uint8ClampedArray",
    "Int16Array",
    "Int32Array",
    "Uint16Array",
    "Uint32Array",
    "BigInt64Array",
    "BigUint64Array",
    "Set",
    "Map",
    "WeakSet",
    "WeakMap",
    "ArrayBuffer",
    "SharedArrayBuffer",
    "Atomics",
    "DataView",
    "JSON",
    "Promise",
    "Generator",
    "GeneratorFunction",
    "AsyncFunction",
    "Reflect",
    "Proxy",
    "Intl",
    "WebAssembly",
  ];
  var ERROR_TYPES = [
    "Error",
    "EvalError",
    "InternalError",
    "RangeError",
    "ReferenceError",
    "SyntaxError",
    "TypeError",
    "URIError",
  ];
  var BUILT_IN_GLOBALS = [
    "setInterval",
    "setTimeout",
    "clearInterval",
    "clearTimeout",
    "require",
    "exports",
    "eval",
    "isFinite",
    "isNaN",
    "parseFloat",
    "parseInt",
    "decodeURI",
    "decodeURIComponent",
    "encodeURI",
    "encodeURIComponent",
    "escape",
    "unescape",
  ];
  var BUILT_INS = [].concat(BUILT_IN_GLOBALS, TYPES, ERROR_TYPES);
  function livescript(hljs) {
    let LIVESCRIPT_BUILT_INS = ["npm", "print"];
    let LIVESCRIPT_LITERALS = ["yes", "no", "on", "off", "it", "that", "void"];
    let LIVESCRIPT_KEYWORDS = [
      "then",
      "unless",
      "until",
      "loop",
      "of",
      "by",
      "when",
      "and",
      "or",
      "is",
      "isnt",
      "not",
      "it",
      "that",
      "otherwise",
      "from",
      "to",
      "til",
      "fallthrough",
      "case",
      "enum",
      "native",
      "list",
      "map",
      "__hasProp",
      "__extends",
      "__slice",
      "__bind",
      "__indexOf",
    ];
    let KEYWORDS$1 = {
      keyword: KEYWORDS.concat(LIVESCRIPT_KEYWORDS),
      literal: LITERALS.concat(LIVESCRIPT_LITERALS),
      built_in: BUILT_INS.concat(LIVESCRIPT_BUILT_INS),
    };
    let JS_IDENT_RE = "[A-Za-z$_](?:-[0-9A-Za-z$_]|[0-9A-Za-z$_])*";
    let TITLE = hljs.inherit(hljs.TITLE_MODE, {
      begin: "[A-Za-z$_](?:-[0-9A-Za-z$_]|[0-9A-Za-z$_])*",
    });
    let SUBST = {
      className: "subst",
      begin: /#\{/,
      end: /\}/,
      keywords: KEYWORDS$1,
    };
    let SUBST_SIMPLE = {
      className: "subst",
      begin: /#[A-Za-z$_]/,
      end: /(?:-[0-9A-Za-z$_]|[0-9A-Za-z$_])*/,
      keywords: KEYWORDS$1,
    };
    let EXPRESSIONS = [
      hljs.BINARY_NUMBER_MODE,
      {
        className: "number",
        begin:
          "(\\b0[xX][a-fA-F0-9_]+)|(\\b\\d(\\d|_\\d)*(\\.(\\d(\\d|_\\d)*)?)?(_*[eE]([-+]\\d(_\\d|\\d)*)?)?[_a-z]*)",
        relevance: 0,
        starts: {
          end: "(\\s*/)?",
          relevance: 0,
        },
      },
      {
        className: "string",
        variants: [
          {
            begin: /'''/,
            end: /'''/,
            contains: [hljs.BACKSLASH_ESCAPE],
          },
          {
            begin: /'/,
            end: /'/,
            contains: [hljs.BACKSLASH_ESCAPE],
          },
          {
            begin: /"""/,
            end: /"""/,
            contains: [hljs.BACKSLASH_ESCAPE, SUBST, SUBST_SIMPLE],
          },
          {
            begin: /"/,
            end: /"/,
            contains: [hljs.BACKSLASH_ESCAPE, SUBST, SUBST_SIMPLE],
          },
          {
            begin: /\\/,
            end: /(\s|$)/,
            excludeEnd: true,
          },
        ],
      },
      {
        className: "regexp",
        variants: [
          {
            begin: "//",
            end: "//[gim]*",
            contains: [SUBST, hljs.HASH_COMMENT_MODE],
          },
          {
            begin: /\/(?![ *])(\\.|[^\\\n])*?\/[gim]*(?=\W)/,
          },
        ],
      },
      {
        begin: "@[A-Za-z$_](?:-[0-9A-Za-z$_]|[0-9A-Za-z$_])*",
      },
      {
        begin: "``",
        end: "``",
        excludeBegin: true,
        excludeEnd: true,
        subLanguage: "javascript",
      },
    ];
    SUBST.contains = EXPRESSIONS;
    let PARAMS = {
      className: "params",
      begin: "\\(",
      returnBegin: true,
      contains: [
        {
          begin: /\(/,
          end: /\)/,
          keywords: KEYWORDS$1,
          contains: ["self"].concat(EXPRESSIONS),
        },
      ],
    };
    let SYMBOLS = {
      begin: "(#=>|=>|\\|>>|-?->|!->)",
    };
    let CLASS_DEFINITION = {
      variants: [
        {
          match: [
            /class\s+/,
            "[A-Za-z$_](?:-[0-9A-Za-z$_]|[0-9A-Za-z$_])*",
            /\s+extends\s+/,
            "[A-Za-z$_](?:-[0-9A-Za-z$_]|[0-9A-Za-z$_])*",
          ],
        },
        {
          match: [/class\s+/, "[A-Za-z$_](?:-[0-9A-Za-z$_]|[0-9A-Za-z$_])*"],
        },
      ],
      scope: {
        2: "title.class",
        4: "title.class.inherited",
      },
      keywords: KEYWORDS$1,
    };
    return {
      name: "LiveScript",
      aliases: ["ls"],
      keywords: KEYWORDS$1,
      illegal: /\/\*/,
      contains: EXPRESSIONS.concat([
        hljs.COMMENT("\\/\\*", "\\*\\/"),
        hljs.HASH_COMMENT_MODE,
        SYMBOLS,
        {
          className: "function",
          contains: [TITLE, PARAMS],
          returnBegin: true,
          variants: [
            {
              begin: "([A-Za-z$_](?:-[0-9A-Za-z$_]|[0-9A-Za-z$_])*\\s*(?:=|:=)\\s*)?(\\(.*\\)\\s*)?\\B->\\*?",
              end: "->\\*?",
            },
            {
              begin:
                "([A-Za-z$_](?:-[0-9A-Za-z$_]|[0-9A-Za-z$_])*\\s*(?:=|:=)\\s*)?!?(\\(.*\\)\\s*)?\\B[-~]{1,2}>\\*?",
              end: "[-~]{1,2}>\\*?",
            },
            {
              begin:
                "([A-Za-z$_](?:-[0-9A-Za-z$_]|[0-9A-Za-z$_])*\\s*(?:=|:=)\\s*)?(\\(.*\\)\\s*)?\\B!?[-~]{1,2}>\\*?",
              end: "!?[-~]{1,2}>\\*?",
            },
          ],
        },
        CLASS_DEFINITION,
        {
          begin: "[A-Za-z$_](?:-[0-9A-Za-z$_]|[0-9A-Za-z$_])*:",
          end: ":",
          returnBegin: true,
          returnEnd: true,
          relevance: 0,
        },
      ]),
    };
  }
  cjsModule.exports = livescript;
});
export { require_livescript };
