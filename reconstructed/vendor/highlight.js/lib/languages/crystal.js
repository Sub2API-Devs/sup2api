/**
 * highlight.js/lib/languages/crystal.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:88643-92608 cjs-fingerprint
var require_crystal = x(function (cjsExports, cjsModule) {
  function crystal(hljs) {
    let CRYSTAL_KEYWORDS = {
      $pattern: "[a-zA-Z_]\\w*[!?=]?",
      keyword:
        "abstract alias annotation as as? asm begin break case class def do else elsif end ensure enum extend for fun if include instance_sizeof is_a? lib macro module next nil? of out pointerof private protected rescue responds_to? return require select self sizeof struct super then type typeof union uninitialized unless until verbatim when while with yield __DIR__ __END_LINE__ __FILE__ __LINE__",
      literal: "false nil true",
    };
    let SUBST = {
      className: "subst",
      begin: /#\{/,
      end: /\}/,
      keywords: CRYSTAL_KEYWORDS,
    };
    let c = {
      className: "variable",
      begin: "(\\$\\W)|((\\$|@@?)(\\w+))(?=[^@$?])(?![A-Za-z])(?![@$?'])",
    };
    let EXPANSION = {
      className: "template-variable",
      variants: [
        {
          begin: "\\{\\{",
          end: "\\}\\}",
        },
        {
          begin: "\\{%",
          end: "%\\}",
        },
      ],
      keywords: CRYSTAL_KEYWORDS,
    };
    function recursiveParen(begin, end) {
      let contains = [
        {
          begin,
          end,
        },
      ];
      contains[0].contains = contains;
      return contains;
    }
    let STRING = {
      className: "string",
      contains: [hljs.BACKSLASH_ESCAPE, SUBST],
      variants: [
        {
          begin: /'/,
          end: /'/,
        },
        {
          begin: /"/,
          end: /"/,
        },
        {
          begin: /`/,
          end: /`/,
        },
        {
          begin: "%[Qwi]?\\(",
          end: "\\)",
          contains: recursiveParen("\\(", "\\)"),
        },
        {
          begin: "%[Qwi]?\\[",
          end: "\\]",
          contains: recursiveParen("\\[", "\\]"),
        },
        {
          begin: "%[Qwi]?\\{",
          end: /\}/,
          contains: recursiveParen(/\{/, /\}/),
        },
        {
          begin: "%[Qwi]?<",
          end: ">",
          contains: recursiveParen("<", ">"),
        },
        {
          begin: "%[Qwi]?\\|",
          end: "\\|",
        },
        {
          begin: /<<-\w+$/,
          end: /^\s*\w+$/,
        },
      ],
      relevance: 0,
    };
    let Q_STRING = {
      className: "string",
      variants: [
        {
          begin: "%q\\(",
          end: "\\)",
          contains: recursiveParen("\\(", "\\)"),
        },
        {
          begin: "%q\\[",
          end: "\\]",
          contains: recursiveParen("\\[", "\\]"),
        },
        {
          begin: "%q\\{",
          end: /\}/,
          contains: recursiveParen(/\{/, /\}/),
        },
        {
          begin: "%q<",
          end: ">",
          contains: recursiveParen("<", ">"),
        },
        {
          begin: "%q\\|",
          end: "\\|",
        },
        {
          begin: /<<-'\w+'$/,
          end: /^\s*\w+$/,
        },
      ],
      relevance: 0,
    };
    let REGEXP = {
      begin: "(?!%\\})(" + hljs.RE_STARTERS_RE + "|\\n|\\b(case|if|select|unless|until|when|while)\\b)\\s*",
      keywords: "case if select unless until when while",
      contains: [
        {
          className: "regexp",
          contains: [hljs.BACKSLASH_ESCAPE, SUBST],
          variants: [
            {
              begin: "//[a-z]*",
              relevance: 0,
            },
            {
              begin: "/(?!\\/)",
              end: "/[a-z]*",
            },
          ],
        },
      ],
      relevance: 0,
    };
    let REGEXP2 = {
      className: "regexp",
      contains: [hljs.BACKSLASH_ESCAPE, SUBST],
      variants: [
        {
          begin: "%r\\(",
          end: "\\)",
          contains: recursiveParen("\\(", "\\)"),
        },
        {
          begin: "%r\\[",
          end: "\\]",
          contains: recursiveParen("\\[", "\\]"),
        },
        {
          begin: "%r\\{",
          end: /\}/,
          contains: recursiveParen(/\{/, /\}/),
        },
        {
          begin: "%r<",
          end: ">",
          contains: recursiveParen("<", ">"),
        },
        {
          begin: "%r\\|",
          end: "\\|",
        },
      ],
      relevance: 0,
    };
    let ATTRIBUTE = {
      className: "meta",
      begin: "@\\[",
      end: "\\]",
      contains: [
        hljs.inherit(hljs.QUOTE_STRING_MODE, {
          className: "string",
        }),
      ],
    };
    let CRYSTAL_DEFAULT_CONTAINS = [
      EXPANSION,
      STRING,
      Q_STRING,
      REGEXP2,
      REGEXP,
      ATTRIBUTE,
      c,
      hljs.HASH_COMMENT_MODE,
      {
        className: "class",
        beginKeywords: "class module struct",
        end: "$|;",
        illegal: /=/,
        contains: [
          hljs.HASH_COMMENT_MODE,
          hljs.inherit(hljs.TITLE_MODE, {
            begin: "[A-Za-z_]\\w*(::\\w+)*(\\?|!)?",
          }),
          {
            begin: "<",
          },
        ],
      },
      {
        className: "class",
        beginKeywords: "lib enum union",
        end: "$|;",
        illegal: /=/,
        contains: [
          hljs.HASH_COMMENT_MODE,
          hljs.inherit(hljs.TITLE_MODE, {
            begin: "[A-Za-z_]\\w*(::\\w+)*(\\?|!)?",
          }),
        ],
      },
      {
        beginKeywords: "annotation",
        end: "$|;",
        illegal: /=/,
        contains: [
          hljs.HASH_COMMENT_MODE,
          hljs.inherit(hljs.TITLE_MODE, {
            begin: "[A-Za-z_]\\w*(::\\w+)*(\\?|!)?",
          }),
        ],
        relevance: 2,
      },
      {
        className: "function",
        beginKeywords: "def",
        end: /\B\b/,
        contains: [
          hljs.inherit(hljs.TITLE_MODE, {
            begin:
              "[a-zA-Z_]\\w*[!?=]?|[-+~]@|<<|>>|[=!]~|===?|<=>|[<>]=?|\\*\\*|[-/+%^&*~|]|//|//=|&[-+*]=?|&\\*\\*|\\[\\][=?]?",
            endsParent: true,
          }),
        ],
      },
      {
        className: "function",
        beginKeywords: "fun macro",
        end: /\B\b/,
        contains: [
          hljs.inherit(hljs.TITLE_MODE, {
            begin:
              "[a-zA-Z_]\\w*[!?=]?|[-+~]@|<<|>>|[=!]~|===?|<=>|[<>]=?|\\*\\*|[-/+%^&*~|]|//|//=|&[-+*]=?|&\\*\\*|\\[\\][=?]?",
            endsParent: true,
          }),
        ],
        relevance: 2,
      },
      {
        className: "symbol",
        begin: hljs.UNDERSCORE_IDENT_RE + "(!|\\?)?:",
        relevance: 0,
      },
      {
        className: "symbol",
        begin: ":",
        contains: [
          STRING,
          {
            begin:
              "[a-zA-Z_]\\w*[!?=]?|[-+~]@|<<|>>|[=!]~|===?|<=>|[<>]=?|\\*\\*|[-/+%^&*~|]|//|//=|&[-+*]=?|&\\*\\*|\\[\\][=?]?",
          },
        ],
        relevance: 0,
      },
      {
        className: "number",
        variants: [
          {
            begin: "\\b0b([01_]+)(_?[ui](8|16|32|64|128))?",
          },
          {
            begin: "\\b0o([0-7_]+)(_?[ui](8|16|32|64|128))?",
          },
          {
            begin: "\\b0x([A-Fa-f0-9_]+)(_?[ui](8|16|32|64|128))?",
          },
          {
            begin: "\\b([1-9][0-9_]*[0-9]|[0-9])(\\.[0-9][0-9_]*)?([eE]_?[-+]?[0-9_]*)?(_?f(32|64))?(?!_)",
          },
          {
            begin: "\\b([1-9][0-9_]*|0)(_?[ui](8|16|32|64|128))?",
          },
        ],
        relevance: 0,
      },
    ];
    SUBST.contains = CRYSTAL_DEFAULT_CONTAINS;
    EXPANSION.contains = CRYSTAL_DEFAULT_CONTAINS.slice(1);
    return {
      name: "Crystal",
      aliases: ["cr"],
      keywords: CRYSTAL_KEYWORDS,
      contains: CRYSTAL_DEFAULT_CONTAINS,
    };
  }
  cjsModule.exports = crystal;
});
export { require_crystal };
