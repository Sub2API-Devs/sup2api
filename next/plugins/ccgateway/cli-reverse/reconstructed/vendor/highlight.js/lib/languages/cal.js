/**
 * highlight.js/lib/languages/cal.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:61419-62603 cjs-fingerprint
var require_cal = __commonJS(function (cjsExports, cjsModule) {
  function cal(hljs) {
    let regex = hljs.regex;
    let KEYWORDS = [
      "div",
      "mod",
      "in",
      "and",
      "or",
      "not",
      "xor",
      "asserterror",
      "begin",
      "case",
      "do",
      "downto",
      "else",
      "end",
      "exit",
      "for",
      "local",
      "if",
      "of",
      "repeat",
      "then",
      "to",
      "until",
      "while",
      "with",
      "var",
    ];
    let LITERALS = "false true";
    let COMMENT_MODES = [
      hljs.C_LINE_COMMENT_MODE,
      hljs.COMMENT(/\{/, /\}/, {
        relevance: 0,
      }),
      hljs.COMMENT(/\(\*/, /\*\)/, {
        relevance: 10,
      }),
    ];
    let STRING = {
      className: "string",
      begin: /'/,
      end: /'/,
      contains: [
        {
          begin: /''/,
        },
      ],
    };
    let CHAR_STRING = {
      className: "string",
      begin: /(#\d+)+/,
    };
    let DATE = {
      className: "number",
      begin: "\\b\\d+(\\.\\d+)?(DT|D|T)",
      relevance: 0,
    };
    let DBL_QUOTED_VARIABLE = {
      className: "string",
      begin: '"',
      end: '"',
    };
    let PROCEDURE = {
      match: [/procedure/, /\s+/, /[a-zA-Z_][\w@]*/, /\s*/],
      scope: {
        1: "keyword",
        3: "title.function",
      },
      contains: [
        {
          className: "params",
          begin: /\(/,
          end: /\)/,
          keywords: KEYWORDS,
          contains: [STRING, CHAR_STRING, hljs.NUMBER_MODE],
        },
        ...COMMENT_MODES,
      ],
    };
    let OBJECT_TYPES = [
      "Table",
      "Form",
      "Report",
      "Dataport",
      "Codeunit",
      "XMLport",
      "MenuSuite",
      "Page",
      "Query",
    ];
    let OBJECT = {
      match: [/OBJECT/, /\s+/, regex.either(...OBJECT_TYPES), /\s+/, /\d+/, /\s+(?=[^\s])/, /.*/, /$/],
      relevance: 3,
      scope: {
        1: "keyword",
        3: "type",
        5: "number",
        7: "title",
      },
    };
    return {
      name: "C/AL",
      case_insensitive: true,
      keywords: {
        keyword: KEYWORDS,
        literal: "false true",
      },
      illegal: /\/\*/,
      contains: [
        {
          match: /[\w]+(?=\=)/,
          scope: "attribute",
          relevance: 0,
        },
        STRING,
        CHAR_STRING,
        DATE,
        DBL_QUOTED_VARIABLE,
        hljs.NUMBER_MODE,
        OBJECT,
        PROCEDURE,
      ],
    };
  }
  cjsModule.exports = cal;
});
export { require_cal };
