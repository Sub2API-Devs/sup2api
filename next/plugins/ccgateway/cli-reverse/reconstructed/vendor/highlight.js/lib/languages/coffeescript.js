/**
 * highlight.js/lib/languages/coffeescript.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:72201-75369 cjs-fingerprint
var require_coffeescript = __commonJS(function (cjsExports, cjsModule) {
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
  function coffeescript(hljs) {
    let COFFEE_BUILT_INS = ["npm", "print"];
    let COFFEE_LITERALS = ["yes", "no", "on", "off"];
    let COFFEE_KEYWORDS = ["then", "unless", "until", "loop", "by", "when", "and", "or", "is", "isnt", "not"];
    let NOT_VALID_KEYWORDS = ["var", "const", "let", "function", "static"];
    let excluding = (list) => (kw) => !list.includes(kw);
    let KEYWORDS$1 = {
      keyword: KEYWORDS.concat(COFFEE_KEYWORDS).filter(excluding(NOT_VALID_KEYWORDS)),
      literal: LITERALS.concat(COFFEE_LITERALS),
      built_in: BUILT_INS.concat(COFFEE_BUILT_INS),
    };
    let JS_IDENT_RE = "[A-Za-z$_][0-9A-Za-z$_]*";
    let SUBST = {
      className: "subst",
      begin: /#\{/,
      end: /\}/,
      keywords: KEYWORDS$1,
    };
    let EXPRESSIONS = [
      hljs.BINARY_NUMBER_MODE,
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
            contains: [hljs.BACKSLASH_ESCAPE, SUBST],
          },
          {
            begin: /"/,
            end: /"/,
            contains: [hljs.BACKSLASH_ESCAPE, SUBST],
          },
        ],
      },
      {
        className: "regexp",
        variants: [
          {
            begin: "///",
            end: "///",
            contains: [SUBST, hljs.HASH_COMMENT_MODE],
          },
          {
            begin: "//[gim]{0,3}(?=\\W)",
            relevance: 0,
          },
          {
            begin: /\/(?![ *]).*?(?![\\]).\/[gim]{0,3}(?=\W)/,
          },
        ],
      },
      {
        begin: "@[A-Za-z$_][0-9A-Za-z$_]*",
      },
      {
        subLanguage: "javascript",
        excludeBegin: true,
        excludeEnd: true,
        variants: [
          {
            begin: "```",
            end: "```",
          },
          {
            begin: "`",
            end: "`",
          },
        ],
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
          keywords: KEYWORDS$1,
          contains: ["self"].concat(EXPRESSIONS),
        },
      ],
    };
    let CLASS_DEFINITION = {
      variants: [
        {
          match: [/class\s+/, "[A-Za-z$_][0-9A-Za-z$_]*", /\s+extends\s+/, "[A-Za-z$_][0-9A-Za-z$_]*"],
        },
        {
          match: [/class\s+/, "[A-Za-z$_][0-9A-Za-z$_]*"],
        },
      ],
      scope: {
        2: "title.class",
        4: "title.class.inherited",
      },
      keywords: KEYWORDS$1,
    };
    return {
      name: "CoffeeScript",
      aliases: ["coffee", "cson", "iced"],
      keywords: KEYWORDS$1,
      illegal: /\/\*/,
      contains: [
        ...EXPRESSIONS,
        hljs.COMMENT("###", "###"),
        hljs.HASH_COMMENT_MODE,
        {
          className: "function",
          begin: "^\\s*[A-Za-z$_][0-9A-Za-z$_]*\\s*=\\s*" + POSSIBLE_PARAMS_RE,
          end: "[-=]>",
          returnBegin: true,
          contains: [TITLE, PARAMS],
        },
        {
          begin: /[:\(,=]\s*/,
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
        CLASS_DEFINITION,
        {
          begin: "[A-Za-z$_][0-9A-Za-z$_]*:",
          end: ":",
          returnBegin: true,
          returnEnd: true,
          relevance: 0,
        },
      ],
    };
  }
  cjsModule.exports = coffeescript;
});
export { require_coffeescript };
