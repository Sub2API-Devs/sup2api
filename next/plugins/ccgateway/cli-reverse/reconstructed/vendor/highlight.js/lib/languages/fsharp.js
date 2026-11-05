/**
 * highlight.js/lib/languages/fsharp.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:146112-150274 cjs-fingerprint
var require_fsharp = __commonJS(function (cjsExports, cjsModule) {
  function escapeRegExp(value) {
    return new RegExp(value.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"), "m");
  }
  function source(re) {
    if (!re) return null;
    if (typeof re === "string") return re;
    return re.source;
  }
  function lookahead(re) {
    return concat("(?=", re, ")");
  }
  function concat(...args) {
    return args.map((x) => source(x)).join("");
  }
  function stripOptionsFromArgs(args) {
    let opts = args[args.length - 1];
    if (typeof opts === "object" && opts.constructor === Object) {
      args.splice(args.length - 1, 1);
      return opts;
    } else return {};
  }
  function either(...args) {
    return (
      "(" + (stripOptionsFromArgs(args).capture ? "" : "?:") + args.map((x) => source(x)).join("|") + ")"
    );
  }
  function fsharp(hljs) {
    let KEYWORDS = [
      "abstract",
      "and",
      "as",
      "assert",
      "base",
      "begin",
      "class",
      "default",
      "delegate",
      "do",
      "done",
      "downcast",
      "downto",
      "elif",
      "else",
      "end",
      "exception",
      "extern",
      "finally",
      "fixed",
      "for",
      "fun",
      "function",
      "global",
      "if",
      "in",
      "inherit",
      "inline",
      "interface",
      "internal",
      "lazy",
      "let",
      "match",
      "member",
      "module",
      "mutable",
      "namespace",
      "new",
      "of",
      "open",
      "or",
      "override",
      "private",
      "public",
      "rec",
      "return",
      "static",
      "struct",
      "then",
      "to",
      "try",
      "type",
      "upcast",
      "use",
      "val",
      "void",
      "when",
      "while",
      "with",
      "yield",
    ];
    let BANG_KEYWORD_MODE = {
      scope: "keyword",
      match: /\b(yield|return|let|do|match|use)!/,
    };
    let PREPROCESSOR_KEYWORDS = [
      "if",
      "else",
      "endif",
      "line",
      "nowarn",
      "light",
      "r",
      "i",
      "I",
      "load",
      "time",
      "help",
      "quit",
    ];
    let LITERALS = [
      "true",
      "false",
      "null",
      "Some",
      "None",
      "Ok",
      "Error",
      "infinity",
      "infinityf",
      "nan",
      "nanf",
    ];
    let SPECIAL_IDENTIFIERS = ["__LINE__", "__SOURCE_DIRECTORY__", "__SOURCE_FILE__"];
    let KNOWN_TYPES = [
      "bool",
      "byte",
      "sbyte",
      "int8",
      "int16",
      "int32",
      "uint8",
      "uint16",
      "uint32",
      "int",
      "uint",
      "int64",
      "uint64",
      "nativeint",
      "unativeint",
      "decimal",
      "float",
      "double",
      "float32",
      "single",
      "char",
      "string",
      "unit",
      "bigint",
      "option",
      "voption",
      "list",
      "array",
      "seq",
      "byref",
      "exn",
      "inref",
      "nativeptr",
      "obj",
      "outref",
      "voidptr",
      "Result",
    ];
    let ALL_KEYWORDS = {
      keyword: KEYWORDS,
      literal: LITERALS,
      built_in: [
        "not",
        "ref",
        "raise",
        "reraise",
        "dict",
        "readOnlyDict",
        "set",
        "get",
        "enum",
        "sizeof",
        "typeof",
        "typedefof",
        "nameof",
        "nullArg",
        "invalidArg",
        "invalidOp",
        "id",
        "fst",
        "snd",
        "ignore",
        "lock",
        "using",
        "box",
        "unbox",
        "tryUnbox",
        "printf",
        "printfn",
        "sprintf",
        "eprintf",
        "eprintfn",
        "fprintf",
        "fprintfn",
        "failwith",
        "failwithf",
      ],
      "variable.constant": SPECIAL_IDENTIFIERS,
    };
    let COMMENT = {
      variants: [
        hljs.COMMENT(/\(\*(?!\))/, /\*\)/, {
          contains: ["self"],
        }),
        hljs.C_LINE_COMMENT_MODE,
      ],
    };
    let IDENTIFIER_RE = /[a-zA-Z_](\w|')*/;
    let QUOTED_IDENTIFIER = {
      scope: "variable",
      begin: /``/,
      end: /``/,
    };
    let BEGIN_GENERIC_TYPE_SYMBOL_RE = /\B('|\^)/;
    let GENERIC_TYPE_SYMBOL = {
      scope: "symbol",
      variants: [
        {
          match: concat(BEGIN_GENERIC_TYPE_SYMBOL_RE, /``.*?``/),
        },
        {
          match: concat(BEGIN_GENERIC_TYPE_SYMBOL_RE, hljs.UNDERSCORE_IDENT_RE),
        },
      ],
      relevance: 0,
    };
    let makeOperatorMode = function ({ includeEqual }) {
      let allOperatorChars;
      if (includeEqual) allOperatorChars = "!%&*+-/<=>@^|~?";
      else allOperatorChars = "!%&*+-/<>@^|~?";
      let OPERATOR_CHARS = Array.from(allOperatorChars);
      let OPERATOR_CHAR_RE = concat("[", ...OPERATOR_CHARS.map(escapeRegExp), "]");
      let OPERATOR_CHAR_OR_DOT_RE = either(OPERATOR_CHAR_RE, /\./);
      let OPERATOR_FIRST_CHAR_OF_MULTIPLE_RE = concat(
        OPERATOR_CHAR_OR_DOT_RE,
        lookahead(OPERATOR_CHAR_OR_DOT_RE),
      );
      let SYMBOLIC_OPERATOR_RE = either(
        concat(OPERATOR_FIRST_CHAR_OF_MULTIPLE_RE, OPERATOR_CHAR_OR_DOT_RE, "*"),
        concat(OPERATOR_CHAR_RE, "+"),
      );
      return {
        scope: "operator",
        match: either(SYMBOLIC_OPERATOR_RE, /:\?>/, /:\?/, /:>/, /:=/, /::?/, /\$/),
        relevance: 0,
      };
    };
    let OPERATOR = makeOperatorMode({
      includeEqual: true,
    });
    let OPERATOR_WITHOUT_EQUAL = makeOperatorMode({
      includeEqual: false,
    });
    let makeTypeAnnotationMode = function (prefix, prefixScope) {
      return {
        begin: concat(prefix, lookahead(concat(/\s*/, either(/\w/, /'/, /\^/, /#/, /``/, /\(/, /{\|/)))),
        beginScope: prefixScope,
        end: lookahead(either(/\n/, /=/)),
        relevance: 0,
        keywords: hljs.inherit(ALL_KEYWORDS, {
          type: KNOWN_TYPES,
        }),
        contains: [
          COMMENT,
          GENERIC_TYPE_SYMBOL,
          hljs.inherit(QUOTED_IDENTIFIER, {
            scope: null,
          }),
          OPERATOR_WITHOUT_EQUAL,
        ],
      };
    };
    let TYPE_ANNOTATION = makeTypeAnnotationMode(/:/, "operator");
    let DISCRIMINATED_UNION_TYPE_ANNOTATION = makeTypeAnnotationMode(/\bof\b/, "keyword");
    let TYPE_DECLARATION = {
      begin: [/(^|\s+)/, /type/, /\s+/, IDENTIFIER_RE],
      beginScope: {
        2: "keyword",
        4: "title.class",
      },
      end: lookahead(/\(|=|$/),
      keywords: ALL_KEYWORDS,
      contains: [
        COMMENT,
        hljs.inherit(QUOTED_IDENTIFIER, {
          scope: null,
        }),
        GENERIC_TYPE_SYMBOL,
        {
          scope: "operator",
          match: /<|>/,
        },
        TYPE_ANNOTATION,
      ],
    };
    let COMPUTATION_EXPRESSION = {
      scope: "computation-expression",
      match: /\b[_a-z]\w*(?=\s*\{)/,
    };
    let PREPROCESSOR = {
      begin: [/^\s*/, concat(/#/, either(...PREPROCESSOR_KEYWORDS)), /\b/],
      beginScope: {
        2: "meta",
      },
      end: lookahead(/\s|$/),
    };
    let NUMBER = {
      variants: [hljs.BINARY_NUMBER_MODE, hljs.C_NUMBER_MODE],
    };
    let QUOTED_STRING = {
      scope: "string",
      begin: /"/,
      end: /"/,
      contains: [hljs.BACKSLASH_ESCAPE],
    };
    let VERBATIM_STRING = {
      scope: "string",
      begin: /@"/,
      end: /"/,
      contains: [
        {
          match: /""/,
        },
        hljs.BACKSLASH_ESCAPE,
      ],
    };
    let TRIPLE_QUOTED_STRING = {
      scope: "string",
      begin: /"""/,
      end: /"""/,
      relevance: 2,
    };
    let SUBST = {
      scope: "subst",
      begin: /\{/,
      end: /\}/,
      keywords: ALL_KEYWORDS,
    };
    let INTERPOLATED_STRING = {
      scope: "string",
      begin: /\$"/,
      end: /"/,
      contains: [
        {
          match: /\{\{/,
        },
        {
          match: /\}\}/,
        },
        hljs.BACKSLASH_ESCAPE,
        SUBST,
      ],
    };
    let INTERPOLATED_VERBATIM_STRING = {
      scope: "string",
      begin: /(\$@|@\$)"/,
      end: /"/,
      contains: [
        {
          match: /\{\{/,
        },
        {
          match: /\}\}/,
        },
        {
          match: /""/,
        },
        hljs.BACKSLASH_ESCAPE,
        SUBST,
      ],
    };
    let INTERPOLATED_TRIPLE_QUOTED_STRING = {
      scope: "string",
      begin: /\$"""/,
      end: /"""/,
      contains: [
        {
          match: /\{\{/,
        },
        {
          match: /\}\}/,
        },
        SUBST,
      ],
      relevance: 2,
    };
    let CHAR_LITERAL = {
      scope: "string",
      match: concat(/'/, either(/[^\\']/, /\\(?:.|\d{3}|x[a-fA-F\d]{2}|u[a-fA-F\d]{4}|U[a-fA-F\d]{8})/), /'/),
    };
    SUBST.contains = [
      INTERPOLATED_VERBATIM_STRING,
      INTERPOLATED_STRING,
      VERBATIM_STRING,
      QUOTED_STRING,
      CHAR_LITERAL,
      BANG_KEYWORD_MODE,
      COMMENT,
      QUOTED_IDENTIFIER,
      TYPE_ANNOTATION,
      COMPUTATION_EXPRESSION,
      PREPROCESSOR,
      NUMBER,
      GENERIC_TYPE_SYMBOL,
      OPERATOR,
    ];
    return {
      name: "F#",
      aliases: ["fs", "f#"],
      keywords: ALL_KEYWORDS,
      illegal: /\/\*/,
      classNameAliases: {
        "computation-expression": "keyword",
      },
      contains: [
        BANG_KEYWORD_MODE,
        {
          variants: [
            INTERPOLATED_TRIPLE_QUOTED_STRING,
            INTERPOLATED_VERBATIM_STRING,
            INTERPOLATED_STRING,
            TRIPLE_QUOTED_STRING,
            VERBATIM_STRING,
            QUOTED_STRING,
            CHAR_LITERAL,
          ],
        },
        COMMENT,
        QUOTED_IDENTIFIER,
        TYPE_DECLARATION,
        {
          scope: "meta",
          begin: /\[</,
          end: />\]/,
          relevance: 2,
          contains: [
            QUOTED_IDENTIFIER,
            TRIPLE_QUOTED_STRING,
            VERBATIM_STRING,
            QUOTED_STRING,
            CHAR_LITERAL,
            NUMBER,
          ],
        },
        DISCRIMINATED_UNION_TYPE_ANNOTATION,
        TYPE_ANNOTATION,
        COMPUTATION_EXPRESSION,
        PREPROCESSOR,
        NUMBER,
        GENERIC_TYPE_SYMBOL,
        OPERATOR,
      ],
    };
  }
  cjsModule.exports = fsharp;
});
export { require_fsharp };
