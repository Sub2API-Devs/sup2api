/**
 * highlight.js/lib/languages/wren.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:530928-533165 cjs-fingerprint
var require_wren = x(function (cjsExports, cjsModule) {
  function wren(hljs) {
    let regex = hljs.regex;
    let IDENT_RE = /[a-zA-Z]\w*/;
    let KEYWORDS = [
      "as",
      "break",
      "class",
      "construct",
      "continue",
      "else",
      "for",
      "foreign",
      "if",
      "import",
      "in",
      "is",
      "return",
      "static",
      "var",
      "while",
    ];
    let LITERALS = ["true", "false", "null"];
    let LANGUAGE_VARS = ["this", "super"];
    let CORE_CLASSES = [
      "Bool",
      "Class",
      "Fiber",
      "Fn",
      "List",
      "Map",
      "Null",
      "Num",
      "Object",
      "Range",
      "Sequence",
      "String",
      "System",
    ];
    let OPERATORS = [
      "-",
      "~",
      /\*/,
      "%",
      /\.\.\./,
      /\.\./,
      /\+/,
      "<<",
      ">>",
      ">=",
      "<=",
      "<",
      ">",
      /\^/,
      /!=/,
      /!/,
      /\bis\b/,
      "==",
      "&&",
      "&",
      /\|\|/,
      /\|/,
      /\?:/,
      "=",
    ];
    let FUNCTION = {
      relevance: 0,
      match: regex.concat(/\b(?!(if|while|for|else|super)\b)/, IDENT_RE, /(?=\s*[({])/),
      className: "title.function",
    };
    let FUNCTION_DEFINITION = {
      match: regex.concat(
        regex.either(regex.concat(/\b(?!(if|while|for|else|super)\b)/, IDENT_RE), regex.either(...OPERATORS)),
        /(?=\s*\([^)]+\)\s*\{)/,
      ),
      className: "title.function",
      starts: {
        contains: [
          {
            begin: /\(/,
            end: /\)/,
            contains: [
              {
                relevance: 0,
                scope: "params",
                match: IDENT_RE,
              },
            ],
          },
        ],
      },
    };
    let CLASS_DEFINITION = {
      variants: [
        {
          match: [/class\s+/, IDENT_RE, /\s+is\s+/, IDENT_RE],
        },
        {
          match: [/class\s+/, IDENT_RE],
        },
      ],
      scope: {
        2: "title.class",
        4: "title.class.inherited",
      },
      keywords: KEYWORDS,
    };
    let OPERATOR = {
      relevance: 0,
      match: regex.either(...OPERATORS),
      className: "operator",
    };
    let TRIPLE_STRING = {
      className: "string",
      begin: /"""/,
      end: /"""/,
    };
    let PROPERTY = {
      className: "property",
      begin: regex.concat(/\./, regex.lookahead(IDENT_RE)),
      end: IDENT_RE,
      excludeBegin: true,
      relevance: 0,
    };
    let FIELD = {
      relevance: 0,
      match: regex.concat(/\b_/, IDENT_RE),
      scope: "variable",
    };
    let CLASS_REFERENCE = {
      relevance: 0,
      match: /\b[A-Z]+[a-z]+([A-Z]+[a-z]+)*/,
      scope: "title.class",
      keywords: {
        _: CORE_CLASSES,
      },
    };
    let NUMBER = hljs.C_NUMBER_MODE;
    let SETTER = {
      match: [IDENT_RE, /\s*/, /=/, /\s*/, /\(/, IDENT_RE, /\)\s*\{/],
      scope: {
        1: "title.function",
        3: "operator",
        6: "params",
      },
    };
    let COMMENT_DOCS = hljs.COMMENT(/\/\*\*/, /\*\//, {
      contains: [
        {
          match: /@[a-z]+/,
          scope: "doctag",
        },
        "self",
      ],
    });
    let SUBST = {
      scope: "subst",
      begin: /%\(/,
      end: /\)/,
      contains: [NUMBER, CLASS_REFERENCE, FUNCTION, FIELD, OPERATOR],
    };
    let STRING = {
      scope: "string",
      begin: /"/,
      end: /"/,
      contains: [
        SUBST,
        {
          scope: "char.escape",
          variants: [
            {
              match: /\\\\|\\["0%abefnrtv]/,
            },
            {
              match: /\\x[0-9A-F]{2}/,
            },
            {
              match: /\\u[0-9A-F]{4}/,
            },
            {
              match: /\\U[0-9A-F]{8}/,
            },
          ],
        },
      ],
    };
    SUBST.contains.push(STRING);
    let ALL_KWS = [...KEYWORDS, ...LANGUAGE_VARS, ...LITERALS];
    let VARIABLE = {
      relevance: 0,
      match: regex.concat("\\b(?!", ALL_KWS.join("|"), "\\b)", /[a-zA-Z_]\w*(?:[?!]|\b)/),
      className: "variable",
    };
    return {
      name: "Wren",
      keywords: {
        keyword: KEYWORDS,
        "variable.language": LANGUAGE_VARS,
        literal: LITERALS,
      },
      contains: [
        {
          scope: "comment",
          variants: [
            {
              begin: [/#!?/, /[A-Za-z_]+(?=\()/],
              beginScope: {},
              keywords: {
                literal: LITERALS,
              },
              contains: [],
              end: /\)/,
            },
            {
              begin: [/#!?/, /[A-Za-z_]+/],
              beginScope: {},
              end: /$/,
            },
          ],
        },
        NUMBER,
        STRING,
        TRIPLE_STRING,
        COMMENT_DOCS,
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        CLASS_REFERENCE,
        CLASS_DEFINITION,
        SETTER,
        FUNCTION_DEFINITION,
        FUNCTION,
        OPERATOR,
        FIELD,
        PROPERTY,
        VARIABLE,
      ],
    };
  }
  cjsModule.exports = wren;
});
export { require_wren };
