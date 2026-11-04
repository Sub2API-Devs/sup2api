/**
 * highlight.js/lib/languages/csharp.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:92608-96657 cjs-fingerprint
var require_csharp = __commonJS(function (cjsExports, cjsModule) {
  function csharp(hljs) {
    let BUILT_IN_KEYWORDS = [
      "bool",
      "byte",
      "char",
      "decimal",
      "delegate",
      "double",
      "dynamic",
      "enum",
      "float",
      "int",
      "long",
      "nint",
      "nuint",
      "object",
      "sbyte",
      "short",
      "string",
      "ulong",
      "uint",
      "ushort",
    ];
    let FUNCTION_MODIFIERS = [
      "public",
      "private",
      "protected",
      "static",
      "internal",
      "protected",
      "abstract",
      "async",
      "extern",
      "override",
      "unsafe",
      "virtual",
      "new",
      "sealed",
      "partial",
    ];
    let LITERAL_KEYWORDS = ["default", "false", "null", "true"];
    let NORMAL_KEYWORDS = [
      "abstract",
      "as",
      "base",
      "break",
      "case",
      "catch",
      "class",
      "const",
      "continue",
      "do",
      "else",
      "event",
      "explicit",
      "extern",
      "finally",
      "fixed",
      "for",
      "foreach",
      "goto",
      "if",
      "implicit",
      "in",
      "interface",
      "internal",
      "is",
      "lock",
      "namespace",
      "new",
      "operator",
      "out",
      "override",
      "params",
      "private",
      "protected",
      "public",
      "readonly",
      "record",
      "ref",
      "return",
      "scoped",
      "sealed",
      "sizeof",
      "stackalloc",
      "static",
      "struct",
      "switch",
      "this",
      "throw",
      "try",
      "typeof",
      "unchecked",
      "unsafe",
      "using",
      "virtual",
      "void",
      "volatile",
      "while",
    ];
    let CONTEXTUAL_KEYWORDS = [
      "add",
      "alias",
      "and",
      "ascending",
      "args",
      "async",
      "await",
      "by",
      "descending",
      "dynamic",
      "equals",
      "file",
      "from",
      "get",
      "global",
      "group",
      "init",
      "into",
      "join",
      "let",
      "nameof",
      "not",
      "notnull",
      "on",
      "or",
      "orderby",
      "partial",
      "record",
      "remove",
      "required",
      "scoped",
      "select",
      "set",
      "unmanaged",
      "value|0",
      "var",
      "when",
      "where",
      "with",
      "yield",
    ];
    let KEYWORDS = {
      keyword: NORMAL_KEYWORDS.concat(CONTEXTUAL_KEYWORDS),
      built_in: BUILT_IN_KEYWORDS,
      literal: LITERAL_KEYWORDS,
    };
    let TITLE_MODE = hljs.inherit(hljs.TITLE_MODE, {
      begin: "[a-zA-Z](\\.?\\w)*",
    });
    let NUMBERS = {
      className: "number",
      variants: [
        {
          begin: "\\b(0b[01']+)",
        },
        {
          begin: "(-?)\\b([\\d']+(\\.[\\d']*)?|\\.[\\d']+)(u|U|l|L|ul|UL|f|F|b|B)",
        },
        {
          begin: "(-?)(\\b0[xX][a-fA-F0-9']+|(\\b[\\d']+(\\.[\\d']*)?|\\.[\\d']+)([eE][-+]?[\\d']+)?)",
        },
      ],
      relevance: 0,
    };
    let RAW_STRING = {
      className: "string",
      begin: /"""("*)(?!")(.|\n)*?"""\1/,
      relevance: 1,
    };
    let VERBATIM_STRING = {
      className: "string",
      begin: '@"',
      end: '"',
      contains: [
        {
          begin: '""',
        },
      ],
    };
    let VERBATIM_STRING_NO_LF = hljs.inherit(VERBATIM_STRING, {
      illegal: /\n/,
    });
    let SUBST = {
      className: "subst",
      begin: /\{/,
      end: /\}/,
      keywords: KEYWORDS,
    };
    let SUBST_NO_LF = hljs.inherit(SUBST, {
      illegal: /\n/,
    });
    let INTERPOLATED_STRING = {
      className: "string",
      begin: /\$"/,
      end: '"',
      illegal: /\n/,
      contains: [
        {
          begin: /\{\{/,
        },
        {
          begin: /\}\}/,
        },
        hljs.BACKSLASH_ESCAPE,
        SUBST_NO_LF,
      ],
    };
    let INTERPOLATED_VERBATIM_STRING = {
      className: "string",
      begin: /\$@"/,
      end: '"',
      contains: [
        {
          begin: /\{\{/,
        },
        {
          begin: /\}\}/,
        },
        {
          begin: '""',
        },
        SUBST,
      ],
    };
    let INTERPOLATED_VERBATIM_STRING_NO_LF = hljs.inherit(INTERPOLATED_VERBATIM_STRING, {
      illegal: /\n/,
      contains: [
        {
          begin: /\{\{/,
        },
        {
          begin: /\}\}/,
        },
        {
          begin: '""',
        },
        SUBST_NO_LF,
      ],
    });
    SUBST.contains = [
      INTERPOLATED_VERBATIM_STRING,
      INTERPOLATED_STRING,
      VERBATIM_STRING,
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      NUMBERS,
      hljs.C_BLOCK_COMMENT_MODE,
    ];
    SUBST_NO_LF.contains = [
      INTERPOLATED_VERBATIM_STRING_NO_LF,
      INTERPOLATED_STRING,
      VERBATIM_STRING_NO_LF,
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      NUMBERS,
      hljs.inherit(hljs.C_BLOCK_COMMENT_MODE, {
        illegal: /\n/,
      }),
    ];
    let STRING = {
      variants: [
        RAW_STRING,
        INTERPOLATED_VERBATIM_STRING,
        INTERPOLATED_STRING,
        VERBATIM_STRING,
        hljs.APOS_STRING_MODE,
        hljs.QUOTE_STRING_MODE,
      ],
    };
    let GENERIC_MODIFIER = {
      begin: "<",
      end: ">",
      contains: [
        {
          beginKeywords: "in out",
        },
        TITLE_MODE,
      ],
    };
    let TYPE_IDENT_RE =
      hljs.IDENT_RE + "(<" + hljs.IDENT_RE + "(\\s*,\\s*" + hljs.IDENT_RE + ")*>)?(\\[\\])?";
    let AT_IDENTIFIER = {
      begin: "@" + hljs.IDENT_RE,
      relevance: 0,
    };
    return {
      name: "C#",
      aliases: ["cs", "c#"],
      keywords: KEYWORDS,
      illegal: /::/,
      contains: [
        hljs.COMMENT("///", "$", {
          returnBegin: true,
          contains: [
            {
              className: "doctag",
              variants: [
                {
                  begin: "///",
                  relevance: 0,
                },
                {
                  begin: "<!--|-->",
                },
                {
                  begin: "</?",
                  end: ">",
                },
              ],
            },
          ],
        }),
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        {
          className: "meta",
          begin: "#",
          end: "$",
          keywords: {
            keyword: "if else elif endif define undef warning error line region endregion pragma checksum",
          },
        },
        STRING,
        NUMBERS,
        {
          beginKeywords: "class interface",
          relevance: 0,
          end: /[{;=]/,
          illegal: /[^\s:,]/,
          contains: [
            {
              beginKeywords: "where class",
            },
            TITLE_MODE,
            GENERIC_MODIFIER,
            hljs.C_LINE_COMMENT_MODE,
            hljs.C_BLOCK_COMMENT_MODE,
          ],
        },
        {
          beginKeywords: "namespace",
          relevance: 0,
          end: /[{;=]/,
          illegal: /[^\s:]/,
          contains: [TITLE_MODE, hljs.C_LINE_COMMENT_MODE, hljs.C_BLOCK_COMMENT_MODE],
        },
        {
          beginKeywords: "record",
          relevance: 0,
          end: /[{;=]/,
          illegal: /[^\s:]/,
          contains: [TITLE_MODE, GENERIC_MODIFIER, hljs.C_LINE_COMMENT_MODE, hljs.C_BLOCK_COMMENT_MODE],
        },
        {
          className: "meta",
          begin: "^\\s*\\[(?=[\\w])",
          excludeBegin: true,
          end: "\\]",
          excludeEnd: true,
          contains: [
            {
              className: "string",
              begin: /"/,
              end: /"/,
            },
          ],
        },
        {
          beginKeywords: "new return throw await else",
          relevance: 0,
        },
        {
          className: "function",
          begin: "(" + TYPE_IDENT_RE + "\\s+)+" + hljs.IDENT_RE + "\\s*(<[^=]+>\\s*)?\\(",
          returnBegin: true,
          end: /\s*[{;=]/,
          excludeEnd: true,
          keywords: KEYWORDS,
          contains: [
            {
              beginKeywords: FUNCTION_MODIFIERS.join(" "),
              relevance: 0,
            },
            {
              begin: hljs.IDENT_RE + "\\s*(<[^=]+>\\s*)?\\(",
              returnBegin: true,
              contains: [hljs.TITLE_MODE, GENERIC_MODIFIER],
              relevance: 0,
            },
            {
              match: /\(\)/,
            },
            {
              className: "params",
              begin: /\(/,
              end: /\)/,
              excludeBegin: true,
              excludeEnd: true,
              keywords: KEYWORDS,
              relevance: 0,
              contains: [STRING, NUMBERS, hljs.C_BLOCK_COMMENT_MODE],
            },
            hljs.C_LINE_COMMENT_MODE,
            hljs.C_BLOCK_COMMENT_MODE,
          ],
        },
        AT_IDENTIFIER,
      ],
    };
  }
  cjsModule.exports = csharp;
});
export { require_csharp };
