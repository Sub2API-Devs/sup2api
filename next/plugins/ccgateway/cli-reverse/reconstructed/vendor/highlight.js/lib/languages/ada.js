/**
 * highlight.js/lib/languages/ada.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:3199-5450 cjs-fingerprint
var require_ada = __commonJS(function (cjsExports, cjsModule) {
  function ada(hljs) {
    let INTEGER_RE = "[eE][-+]?\\d(_|\\d)*";
    let DECIMAL_LITERAL_RE = "\\d(_|\\d)*(\\.\\d(_|\\d)*)?(" + INTEGER_RE + ")?";
    let BASED_INTEGER_RE = "\\w+";
    let begin =
      "\\b(" + ("\\d(_|\\d)*#\\w+(\\.\\w+)?#(" + INTEGER_RE + ")?") + "|" + DECIMAL_LITERAL_RE + ")";
    let ID_REGEX = "[A-Za-z](_?[A-Za-z0-9.])*";
    let BAD_CHARS = `[]\\{\\}%#'"`;
    let COMMENTS = hljs.COMMENT("--", "$");
    let VAR_DECLS = {
      begin: "\\s+:\\s+",
      end: "\\s*(:=|;|\\)|=>|$)",
      illegal: `[]\\{\\}%#'"`,
      contains: [
        {
          beginKeywords: "loop for declare others",
          endsParent: true,
        },
        {
          className: "keyword",
          beginKeywords: "not null constant access function procedure in out aliased exception",
        },
        {
          className: "type",
          begin: "[A-Za-z](_?[A-Za-z0-9.])*",
          endsParent: true,
          relevance: 0,
        },
      ],
    };
    return {
      name: "Ada",
      case_insensitive: true,
      keywords: {
        keyword: [
          "abort",
          "else",
          "new",
          "return",
          "abs",
          "elsif",
          "not",
          "reverse",
          "abstract",
          "end",
          "accept",
          "entry",
          "select",
          "access",
          "exception",
          "of",
          "separate",
          "aliased",
          "exit",
          "or",
          "some",
          "all",
          "others",
          "subtype",
          "and",
          "for",
          "out",
          "synchronized",
          "array",
          "function",
          "overriding",
          "at",
          "tagged",
          "generic",
          "package",
          "task",
          "begin",
          "goto",
          "pragma",
          "terminate",
          "body",
          "private",
          "then",
          "if",
          "procedure",
          "type",
          "case",
          "in",
          "protected",
          "constant",
          "interface",
          "is",
          "raise",
          "use",
          "declare",
          "range",
          "delay",
          "limited",
          "record",
          "when",
          "delta",
          "loop",
          "rem",
          "while",
          "digits",
          "renames",
          "with",
          "do",
          "mod",
          "requeue",
          "xor",
        ],
        literal: ["True", "False"],
      },
      contains: [
        COMMENTS,
        {
          className: "string",
          begin: /"/,
          end: /"/,
          contains: [
            {
              begin: /""/,
              relevance: 0,
            },
          ],
        },
        {
          className: "string",
          begin: /'.'/,
        },
        {
          className: "number",
          begin,
          relevance: 0,
        },
        {
          className: "symbol",
          begin: "'[A-Za-z](_?[A-Za-z0-9.])*",
        },
        {
          className: "title",
          begin: "(\\bwith\\s+)?(\\bprivate\\s+)?\\bpackage\\s+(\\bbody\\s+)?",
          end: "(is|$)",
          keywords: "package body",
          excludeBegin: true,
          excludeEnd: true,
          illegal: `[]\\{\\}%#'"`,
        },
        {
          begin: "(\\b(with|overriding)\\s+)?\\b(function|procedure)\\s+",
          end: "(\\bis|\\bwith|\\brenames|\\)\\s*;)",
          keywords: "overriding function procedure with is renames return",
          returnBegin: true,
          contains: [
            COMMENTS,
            {
              className: "title",
              begin: "(\\bwith\\s+)?\\b(function|procedure)\\s+",
              end: "(\\(|\\s+|$)",
              excludeBegin: true,
              excludeEnd: true,
              illegal: `[]\\{\\}%#'"`,
            },
            VAR_DECLS,
            {
              className: "type",
              begin: "\\breturn\\s+",
              end: "(\\s+|;|$)",
              keywords: "return",
              excludeBegin: true,
              excludeEnd: true,
              endsParent: true,
              illegal: `[]\\{\\}%#'"`,
            },
          ],
        },
        {
          className: "type",
          begin: "\\b(sub)?type\\s+",
          end: "\\s+",
          keywords: "type",
          excludeBegin: true,
          illegal: `[]\\{\\}%#'"`,
        },
        VAR_DECLS,
      ],
    };
  }
  cjsModule.exports = ada;
});
export { require_ada };
