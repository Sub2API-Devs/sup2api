/**
 * highlight.js/lib/languages/c.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:57208-61419 cjs-fingerprint
var require_c = x(function (cjsExports, cjsModule) {
  function c(hljs) {
    let regex = hljs.regex;
    let C_LINE_COMMENT_MODE = hljs.COMMENT("//", "$", {
      contains: [
        {
          begin: /\\\n/,
        },
      ],
    });
    let DECLTYPE_AUTO_RE = "decltype\\(auto\\)";
    let NAMESPACE_RE = "[a-zA-Z_]\\w*::";
    let TEMPLATE_ARGUMENT_RE = "<[^<>]+>";
    let FUNCTION_TYPE_RE =
      "(decltype\\(auto\\)|" +
      regex.optional("[a-zA-Z_]\\w*::") +
      "[a-zA-Z_]\\w*" +
      regex.optional("<[^<>]+>") +
      ")";
    let TYPES = {
      className: "type",
      variants: [
        {
          begin: "\\b[a-z\\d_]*_t\\b",
        },
        {
          match: /\batomic_[a-z]{3,6}\b/,
        },
      ],
    };
    let CHARACTER_ESCAPES = "\\\\(x[0-9A-Fa-f]{2}|u[0-9A-Fa-f]{4,8}|[0-7]{3}|\\S)";
    let STRINGS = {
      className: "string",
      variants: [
        {
          begin: '(u8?|U|L)?"',
          end: '"',
          illegal: "\\n",
          contains: [hljs.BACKSLASH_ESCAPE],
        },
        {
          begin: "(u8?|U|L)?'(\\\\(x[0-9A-Fa-f]{2}|u[0-9A-Fa-f]{4,8}|[0-7]{3}|\\S)|.)",
          end: "'",
          illegal: ".",
        },
        hljs.END_SAME_AS_BEGIN({
          begin: /(?:u8?|U|L)?R"([^()\\ ]{0,16})\(/,
          end: /\)([^()\\ ]{0,16})"/,
        }),
      ],
    };
    let NUMBERS = {
      className: "number",
      variants: [
        {
          match: /\b(0b[01']+)/,
        },
        {
          match: /(-?)\b([\d']+(\.[\d']*)?|\.[\d']+)((ll|LL|l|L)(u|U)?|(u|U)(ll|LL|l|L)?|f|F|b|B)/,
        },
        {
          match:
            /(-?)\b(0[xX][a-fA-F0-9]+(?:'[a-fA-F0-9]+)*(?:\.[a-fA-F0-9]*(?:'[a-fA-F0-9]*)*)?(?:[pP][-+]?[0-9]+)?(l|L)?(u|U)?)/,
        },
        {
          match: /(-?)\b\d+(?:'\d+)*(?:\.\d*(?:'\d*)*)?(?:[eE][-+]?\d+)?/,
        },
      ],
      relevance: 0,
    };
    let PREPROCESSOR = {
      className: "meta",
      begin: /#\s*[a-z]+\b/,
      end: /$/,
      keywords: {
        keyword:
          "if else elif endif define undef warning error line pragma _Pragma ifdef ifndef elifdef elifndef include",
      },
      contains: [
        {
          begin: /\\\n/,
          relevance: 0,
        },
        hljs.inherit(STRINGS, {
          className: "string",
        }),
        {
          className: "string",
          begin: /<.*?>/,
        },
        C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
      ],
    };
    let TITLE_MODE = {
      className: "title",
      begin: regex.optional("[a-zA-Z_]\\w*::") + hljs.IDENT_RE,
      relevance: 0,
    };
    let FUNCTION_TITLE = regex.optional("[a-zA-Z_]\\w*::") + hljs.IDENT_RE + "\\s*\\(";
    let KEYWORDS = {
      keyword: [
        "asm",
        "auto",
        "break",
        "case",
        "continue",
        "default",
        "do",
        "else",
        "enum",
        "extern",
        "for",
        "fortran",
        "goto",
        "if",
        "inline",
        "register",
        "restrict",
        "return",
        "sizeof",
        "typeof",
        "typeof_unqual",
        "struct",
        "switch",
        "typedef",
        "union",
        "volatile",
        "while",
        "_Alignas",
        "_Alignof",
        "_Atomic",
        "_Generic",
        "_Noreturn",
        "_Static_assert",
        "_Thread_local",
        "alignas",
        "alignof",
        "noreturn",
        "static_assert",
        "thread_local",
        "_Pragma",
      ],
      type: [
        "float",
        "double",
        "signed",
        "unsigned",
        "int",
        "short",
        "long",
        "char",
        "void",
        "_Bool",
        "_BitInt",
        "_Complex",
        "_Imaginary",
        "_Decimal32",
        "_Decimal64",
        "_Decimal96",
        "_Decimal128",
        "_Decimal64x",
        "_Decimal128x",
        "_Float16",
        "_Float32",
        "_Float64",
        "_Float128",
        "_Float32x",
        "_Float64x",
        "_Float128x",
        "const",
        "static",
        "constexpr",
        "complex",
        "bool",
        "imaginary",
      ],
      literal: "true false NULL",
      built_in:
        "std string wstring cin cout cerr clog stdin stdout stderr stringstream istringstream ostringstream auto_ptr deque list queue stack vector map set pair bitset multiset multimap unordered_set unordered_map unordered_multiset unordered_multimap priority_queue make_pair array shared_ptr abort terminate abs acos asin atan2 atan calloc ceil cosh cos exit exp fabs floor fmod fprintf fputs free frexp fscanf future isalnum isalpha iscntrl isdigit isgraph islower isprint ispunct isspace isupper isxdigit tolower toupper labs ldexp log10 log malloc realloc memchr memcmp memcpy memset modf pow printf putchar puts scanf sinh sin snprintf sprintf sqrt sscanf strcat strchr strcmp strcpy strcspn strlen strncat strncmp strncpy strpbrk strrchr strspn strstr tanh tan vfprintf vprintf vsprintf endl initializer_list unique_ptr",
    };
    let EXPRESSION_CONTAINS = [
      PREPROCESSOR,
      TYPES,
      C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      NUMBERS,
      STRINGS,
    ];
    let EXPRESSION_CONTEXT = {
      variants: [
        {
          begin: /=/,
          end: /;/,
        },
        {
          begin: /\(/,
          end: /\)/,
        },
        {
          beginKeywords: "new throw return else",
          end: /;/,
        },
      ],
      keywords: KEYWORDS,
      contains: EXPRESSION_CONTAINS.concat([
        {
          begin: /\(/,
          end: /\)/,
          keywords: KEYWORDS,
          contains: EXPRESSION_CONTAINS.concat(["self"]),
          relevance: 0,
        },
      ]),
      relevance: 0,
    };
    let FUNCTION_DECLARATION = {
      begin: "(" + FUNCTION_TYPE_RE + "[\\*&\\s]+)+" + FUNCTION_TITLE,
      returnBegin: true,
      end: /[{;=]/,
      excludeEnd: true,
      keywords: KEYWORDS,
      illegal: /[^\w\s\*&:<>.]/,
      contains: [
        {
          begin: "decltype\\(auto\\)",
          keywords: KEYWORDS,
          relevance: 0,
        },
        {
          begin: FUNCTION_TITLE,
          returnBegin: true,
          contains: [
            hljs.inherit(TITLE_MODE, {
              className: "title.function",
            }),
          ],
          relevance: 0,
        },
        {
          relevance: 0,
          match: /,/,
        },
        {
          className: "params",
          begin: /\(/,
          end: /\)/,
          keywords: KEYWORDS,
          relevance: 0,
          contains: [
            C_LINE_COMMENT_MODE,
            hljs.C_BLOCK_COMMENT_MODE,
            STRINGS,
            NUMBERS,
            TYPES,
            {
              begin: /\(/,
              end: /\)/,
              keywords: KEYWORDS,
              relevance: 0,
              contains: ["self", C_LINE_COMMENT_MODE, hljs.C_BLOCK_COMMENT_MODE, STRINGS, NUMBERS, TYPES],
            },
          ],
        },
        TYPES,
        C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        PREPROCESSOR,
      ],
    };
    return {
      name: "C",
      aliases: ["h"],
      keywords: KEYWORDS,
      disableAutodetect: true,
      illegal: "</",
      contains: [].concat(EXPRESSION_CONTEXT, FUNCTION_DECLARATION, EXPRESSION_CONTAINS, [
        PREPROCESSOR,
        {
          begin: hljs.IDENT_RE + "::",
          keywords: KEYWORDS,
        },
        {
          className: "class",
          beginKeywords: "enum class struct union",
          end: /[{;:<>=]/,
          contains: [
            {
              beginKeywords: "final class struct",
            },
            hljs.TITLE_MODE,
          ],
        },
      ]),
      exports: {
        preprocessor: PREPROCESSOR,
        strings: STRINGS,
        keywords: KEYWORDS,
      },
    };
  }
  cjsModule.exports = c;
});
export { require_c };
