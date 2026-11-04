/**
 * highlight.js/lib/languages/javascript.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:206900-213926 cjs-fingerprint
var require_javascript = __commonJS(function (cjsExports, cjsModule) {
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
  var BUILT_IN_VARIABLES = [
    "arguments",
    "this",
    "super",
    "console",
    "window",
    "document",
    "localStorage",
    "sessionStorage",
    "module",
    "global",
  ];
  var BUILT_INS = [].concat(BUILT_IN_GLOBALS, TYPES, ERROR_TYPES);
  function javascript(hljs) {
    let regex = hljs.regex;
    let hasClosingTag = (match, { after }) => {
      let tag = "</" + match[0].slice(1);
      return match.input.indexOf(tag, after) !== -1;
    };
    let IDENT_RE$1 = "[A-Za-z$_][0-9A-Za-z$_]*";
    let FRAGMENT = {
      begin: "<>",
      end: "</>",
    };
    let XML_SELF_CLOSING = /<[A-Za-z0-9\\._:-]+\s*\/>/;
    let XML_TAG = {
      begin: /<[A-Za-z0-9\\._:-]+/,
      end: /\/[A-Za-z0-9\\._:-]+>|\/>/,
      isTrulyOpeningTag: (match, response) => {
        let afterMatchIndex = match[0].length + match.index;
        let nextChar = match.input[afterMatchIndex];
        if (nextChar === "<" || nextChar === ",") {
          response.ignoreMatch();
          return;
        }
        if (nextChar === ">") {
          if (
            !hasClosingTag(match, {
              after: afterMatchIndex,
            })
          )
            response.ignoreMatch();
        }
        let m;
        let afterMatch = match.input.substring(afterMatchIndex);
        if ((m = afterMatch.match(/^\s*=/))) {
          response.ignoreMatch();
          return;
        }
        if ((m = afterMatch.match(/^\s+extends\s+/))) {
          if (m.index === 0) {
            response.ignoreMatch();
            return;
          }
        }
      },
    };
    let KEYWORDS$1 = {
      $pattern: "[A-Za-z$_][0-9A-Za-z$_]*",
      keyword: KEYWORDS,
      literal: LITERALS,
      built_in: BUILT_INS,
      "variable.language": BUILT_IN_VARIABLES,
    };
    let decimalDigits = "[0-9](_?[0-9])*";
    let frac = "\\.([0-9](_?[0-9])*)";
    let decimalInteger = "0|[1-9](_?[0-9])*|0[0-7]*[89][0-9]*";
    let NUMBER = {
      className: "number",
      variants: [
        {
          begin:
            "(\\b(0|[1-9](_?[0-9])*|0[0-7]*[89][0-9]*)((\\.([0-9](_?[0-9])*))|\\.)?|(\\.([0-9](_?[0-9])*)))[eE][+-]?([0-9](_?[0-9])*)\\b",
        },
        {
          begin:
            "\\b(0|[1-9](_?[0-9])*|0[0-7]*[89][0-9]*)\\b((\\.([0-9](_?[0-9])*))\\b|\\.)?|(\\.([0-9](_?[0-9])*))\\b",
        },
        {
          begin: "\\b(0|[1-9](_?[0-9])*)n\\b",
        },
        {
          begin: "\\b0[xX][0-9a-fA-F](_?[0-9a-fA-F])*n?\\b",
        },
        {
          begin: "\\b0[bB][0-1](_?[0-1])*n?\\b",
        },
        {
          begin: "\\b0[oO][0-7](_?[0-7])*n?\\b",
        },
        {
          begin: "\\b0[0-7]+n?\\b",
        },
      ],
      relevance: 0,
    };
    let SUBST = {
      className: "subst",
      begin: "\\$\\{",
      end: "\\}",
      keywords: KEYWORDS$1,
      contains: [],
    };
    let HTML_TEMPLATE = {
      begin: ".?html`",
      end: "",
      starts: {
        end: "`",
        returnEnd: false,
        contains: [hljs.BACKSLASH_ESCAPE, SUBST],
        subLanguage: "xml",
      },
    };
    let CSS_TEMPLATE = {
      begin: ".?css`",
      end: "",
      starts: {
        end: "`",
        returnEnd: false,
        contains: [hljs.BACKSLASH_ESCAPE, SUBST],
        subLanguage: "css",
      },
    };
    let GRAPHQL_TEMPLATE = {
      begin: ".?gql`",
      end: "",
      starts: {
        end: "`",
        returnEnd: false,
        contains: [hljs.BACKSLASH_ESCAPE, SUBST],
        subLanguage: "graphql",
      },
    };
    let TEMPLATE_STRING = {
      className: "string",
      begin: "`",
      end: "`",
      contains: [hljs.BACKSLASH_ESCAPE, SUBST],
    };
    let COMMENT = {
      className: "comment",
      variants: [
        hljs.COMMENT(/\/\*\*(?!\/)/, "\\*/", {
          relevance: 0,
          contains: [
            {
              begin: "(?=@[A-Za-z]+)",
              relevance: 0,
              contains: [
                {
                  className: "doctag",
                  begin: "@[A-Za-z]+",
                },
                {
                  className: "type",
                  begin: "\\{",
                  end: "\\}",
                  excludeEnd: true,
                  excludeBegin: true,
                  relevance: 0,
                },
                {
                  className: "variable",
                  begin: "[A-Za-z$_][0-9A-Za-z$_]*(?=\\s*(-)|$)",
                  endsParent: true,
                  relevance: 0,
                },
                {
                  begin: /(?=[^\n])\s/,
                  relevance: 0,
                },
              ],
            },
          ],
        }),
        hljs.C_BLOCK_COMMENT_MODE,
        hljs.C_LINE_COMMENT_MODE,
      ],
    };
    let SUBST_INTERNALS = [
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      HTML_TEMPLATE,
      CSS_TEMPLATE,
      GRAPHQL_TEMPLATE,
      TEMPLATE_STRING,
      {
        match: /\$\d+/,
      },
      NUMBER,
    ];
    SUBST.contains = SUBST_INTERNALS.concat({
      begin: /\{/,
      end: /\}/,
      keywords: KEYWORDS$1,
      contains: ["self"].concat(SUBST_INTERNALS),
    });
    let SUBST_AND_COMMENTS = [].concat(COMMENT, SUBST.contains);
    let PARAMS_CONTAINS = SUBST_AND_COMMENTS.concat([
      {
        begin: /(\s*)\(/,
        end: /\)/,
        keywords: KEYWORDS$1,
        contains: ["self"].concat(SUBST_AND_COMMENTS),
      },
    ]);
    let PARAMS = {
      className: "params",
      begin: /(\s*)\(/,
      end: /\)/,
      excludeBegin: true,
      excludeEnd: true,
      keywords: KEYWORDS$1,
      contains: PARAMS_CONTAINS,
    };
    let CLASS_OR_EXTENDS = {
      variants: [
        {
          match: [
            /class/,
            /\s+/,
            "[A-Za-z$_][0-9A-Za-z$_]*",
            /\s+/,
            /extends/,
            /\s+/,
            regex.concat(
              "[A-Za-z$_][0-9A-Za-z$_]*",
              "(",
              regex.concat(/\./, "[A-Za-z$_][0-9A-Za-z$_]*"),
              ")*",
            ),
          ],
          scope: {
            1: "keyword",
            3: "title.class",
            5: "keyword",
            7: "title.class.inherited",
          },
        },
        {
          match: [/class/, /\s+/, "[A-Za-z$_][0-9A-Za-z$_]*"],
          scope: {
            1: "keyword",
            3: "title.class",
          },
        },
      ],
    };
    let CLASS_REFERENCE = {
      relevance: 0,
      match: regex.either(
        /\bJSON/,
        /\b[A-Z][a-z]+([A-Z][a-z]*|\d)*/,
        /\b[A-Z]{2,}([A-Z][a-z]+|\d)+([A-Z][a-z]*)*/,
        /\b[A-Z]{2,}[a-z]+([A-Z][a-z]+|\d)*([A-Z][a-z]*)*/,
      ),
      className: "title.class",
      keywords: {
        _: [...TYPES, ...ERROR_TYPES],
      },
    };
    let USE_STRICT = {
      label: "use_strict",
      className: "meta",
      relevance: 10,
      begin: /^\s*['"]use (strict|asm)['"]/,
    };
    let FUNCTION_DEFINITION = {
      variants: [
        {
          match: [/function/, /\s+/, "[A-Za-z$_][0-9A-Za-z$_]*", /(?=\s*\()/],
        },
        {
          match: [/function/, /\s*(?=\()/],
        },
      ],
      className: {
        1: "keyword",
        3: "title.function",
      },
      label: "func.def",
      contains: [PARAMS],
      illegal: /%/,
    };
    let UPPER_CASE_CONSTANT = {
      relevance: 0,
      match: /\b[A-Z][A-Z_0-9]+\b/,
      className: "variable.constant",
    };
    function noneOf(list) {
      return regex.concat("(?!", list.join("|"), ")");
    }
    let FUNCTION_CALL = {
      match: regex.concat(
        /\b/,
        noneOf([...BUILT_IN_GLOBALS, "super", "import"].map((x) => `${x}\\s*\\(`)),
        "[A-Za-z$_][0-9A-Za-z$_]*",
        regex.lookahead(/\s*\(/),
      ),
      className: "title.function",
      relevance: 0,
    };
    let PROPERTY_ACCESS = {
      begin: regex.concat(
        /\./,
        regex.lookahead(regex.concat("[A-Za-z$_][0-9A-Za-z$_]*", /(?![0-9A-Za-z$_(])/)),
      ),
      end: "[A-Za-z$_][0-9A-Za-z$_]*",
      excludeBegin: true,
      keywords: "prototype",
      className: "property",
      relevance: 0,
    };
    let GETTER_OR_SETTER = {
      match: [/get|set/, /\s+/, "[A-Za-z$_][0-9A-Za-z$_]*", /(?=\()/],
      className: {
        1: "keyword",
        3: "title.function",
      },
      contains: [
        {
          begin: /\(\)/,
        },
        PARAMS,
      ],
    };
    let FUNC_LEAD_IN_RE =
      "(\\([^()]*(\\([^()]*(\\([^()]*\\)[^()]*)*\\)[^()]*)*\\)|" + hljs.UNDERSCORE_IDENT_RE + ")\\s*=>";
    let FUNCTION_VARIABLE = {
      match: [
        /const|var|let/,
        /\s+/,
        "[A-Za-z$_][0-9A-Za-z$_]*",
        /\s*/,
        /=\s*/,
        /(async\s*)?/,
        regex.lookahead(FUNC_LEAD_IN_RE),
      ],
      keywords: "async",
      className: {
        1: "keyword",
        3: "title.function",
      },
      contains: [PARAMS],
    };
    return {
      name: "JavaScript",
      aliases: ["js", "jsx", "mjs", "cjs"],
      keywords: KEYWORDS$1,
      exports: {
        PARAMS_CONTAINS,
        CLASS_REFERENCE,
      },
      illegal: /#(?![$_A-z])/,
      contains: [
        hljs.SHEBANG({
          label: "shebang",
          binary: "node",
          relevance: 5,
        }),
        USE_STRICT,
        hljs.APOS_STRING_MODE,
        hljs.QUOTE_STRING_MODE,
        HTML_TEMPLATE,
        CSS_TEMPLATE,
        GRAPHQL_TEMPLATE,
        TEMPLATE_STRING,
        COMMENT,
        {
          match: /\$\d+/,
        },
        NUMBER,
        CLASS_REFERENCE,
        {
          scope: "attr",
          match: "[A-Za-z$_][0-9A-Za-z$_]*" + regex.lookahead(":"),
          relevance: 0,
        },
        FUNCTION_VARIABLE,
        {
          begin: "(" + hljs.RE_STARTERS_RE + "|\\b(case|return|throw)\\b)\\s*",
          keywords: "return throw case",
          relevance: 0,
          contains: [
            COMMENT,
            hljs.REGEXP_MODE,
            {
              className: "function",
              begin: FUNC_LEAD_IN_RE,
              returnBegin: true,
              end: "\\s*=>",
              contains: [
                {
                  className: "params",
                  variants: [
                    {
                      begin: hljs.UNDERSCORE_IDENT_RE,
                      relevance: 0,
                    },
                    {
                      className: null,
                      begin: /\(\s*\)/,
                      skip: true,
                    },
                    {
                      begin: /(\s*)\(/,
                      end: /\)/,
                      excludeBegin: true,
                      excludeEnd: true,
                      keywords: KEYWORDS$1,
                      contains: PARAMS_CONTAINS,
                    },
                  ],
                },
              ],
            },
            {
              begin: /,/,
              relevance: 0,
            },
            {
              match: /\s+/,
              relevance: 0,
            },
            {
              variants: [
                {
                  begin: FRAGMENT.begin,
                  end: FRAGMENT.end,
                },
                {
                  match: XML_SELF_CLOSING,
                },
                {
                  begin: XML_TAG.begin,
                  "on:begin": XML_TAG.isTrulyOpeningTag,
                  end: XML_TAG.end,
                },
              ],
              subLanguage: "xml",
              contains: [
                {
                  begin: XML_TAG.begin,
                  end: XML_TAG.end,
                  skip: true,
                  contains: ["self"],
                },
              ],
            },
          ],
        },
        FUNCTION_DEFINITION,
        {
          beginKeywords: "while if switch catch for",
        },
        {
          begin:
            "\\b(?!function)" +
            hljs.UNDERSCORE_IDENT_RE +
            "\\([^()]*(\\([^()]*(\\([^()]*\\)[^()]*)*\\)[^()]*)*\\)\\s*\\{",
          returnBegin: true,
          label: "func.def",
          contains: [
            PARAMS,
            hljs.inherit(hljs.TITLE_MODE, {
              begin: "[A-Za-z$_][0-9A-Za-z$_]*",
              className: "title.function",
            }),
          ],
        },
        {
          match: /\.\.\./,
          relevance: 0,
        },
        PROPERTY_ACCESS,
        {
          match: "\\$[A-Za-z$_][0-9A-Za-z$_]*",
          relevance: 0,
        },
        {
          match: [/\bconstructor(?=\s*\()/],
          className: {
            1: "title.function",
          },
          contains: [PARAMS],
        },
        FUNCTION_CALL,
        UPPER_CASE_CONSTANT,
        CLASS_OR_EXTENDS,
        GETTER_OR_SETTER,
        {
          match: /\$[(.]/,
        },
      ],
    };
  }
  cjsModule.exports = javascript;
});
export { require_javascript };
