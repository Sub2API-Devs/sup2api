/**
 * highlight.js/lib/languages/lisp.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:244617-246122 cjs-fingerprint
var require_lisp = __commonJS(function (cjsExports, cjsModule) {
  function lisp(hljs) {
    let LITERAL = {
      className: "literal",
      begin: "\\b(t{1}|nil)\\b",
    };
    let NUMBER = {
      className: "number",
      variants: [
        {
          begin: "(-|\\+)?\\d+(\\.\\d+|\\/\\d+)?((d|e|f|l|s|D|E|F|L|S)(\\+|-)?\\d+)?",
          relevance: 0,
        },
        {
          begin: "#(b|B)[0-1]+(/[0-1]+)?",
        },
        {
          begin: "#(o|O)[0-7]+(/[0-7]+)?",
        },
        {
          begin: "#(x|X)[0-9a-fA-F]+(/[0-9a-fA-F]+)?",
        },
        {
          begin:
            "#(c|C)\\((-|\\+)?\\d+(\\.\\d+|\\/\\d+)?((d|e|f|l|s|D|E|F|L|S)(\\+|-)?\\d+)? +(-|\\+)?\\d+(\\.\\d+|\\/\\d+)?((d|e|f|l|s|D|E|F|L|S)(\\+|-)?\\d+)?",
          end: "\\)",
        },
      ],
    };
    let STRING = hljs.inherit(hljs.QUOTE_STRING_MODE, {
      illegal: null,
    });
    let COMMENT = hljs.COMMENT(";", "$", {
      relevance: 0,
    });
    let VARIABLE = {
      begin: "\\*",
      end: "\\*",
    };
    let KEYWORD = {
      className: "symbol",
      begin: "[:&][a-zA-Z_\\-+\\*\\/<=>&#][a-zA-Z0-9_\\-+*\\/<=>&#!]*",
    };
    let IDENT = {
      begin: "[a-zA-Z_\\-+\\*\\/<=>&#][a-zA-Z0-9_\\-+*\\/<=>&#!]*",
      relevance: 0,
    };
    let MEC = {
      begin: "\\|[^]*?\\|",
    };
    let QUOTED = {
      contains: [
        NUMBER,
        STRING,
        VARIABLE,
        KEYWORD,
        {
          begin: "\\(",
          end: "\\)",
          contains: ["self", LITERAL, STRING, NUMBER, IDENT],
        },
        IDENT,
      ],
      variants: [
        {
          begin: "['`]\\(",
          end: "\\)",
        },
        {
          begin: "\\(quote ",
          end: "\\)",
          keywords: {
            name: "quote",
          },
        },
        {
          begin: "'\\|[^]*?\\|",
        },
      ],
    };
    let QUOTED_ATOM = {
      variants: [
        {
          begin: "'[a-zA-Z_\\-+\\*\\/<=>&#][a-zA-Z0-9_\\-+*\\/<=>&#!]*",
        },
        {
          begin:
            "#'[a-zA-Z_\\-+\\*\\/<=>&#][a-zA-Z0-9_\\-+*\\/<=>&#!]*(::[a-zA-Z_\\-+\\*\\/<=>&#][a-zA-Z0-9_\\-+*\\/<=>&#!]*)*",
        },
      ],
    };
    let LIST = {
      begin: "\\(\\s*",
      end: "\\)",
    };
    let BODY = {
      endsWithParent: true,
      relevance: 0,
    };
    LIST.contains = [
      {
        className: "name",
        variants: [
          {
            begin: "[a-zA-Z_\\-+\\*\\/<=>&#][a-zA-Z0-9_\\-+*\\/<=>&#!]*",
            relevance: 0,
          },
          {
            begin: "\\|[^]*?\\|",
          },
        ],
      },
      BODY,
    ];
    BODY.contains = [
      QUOTED,
      QUOTED_ATOM,
      LIST,
      LITERAL,
      NUMBER,
      STRING,
      COMMENT,
      VARIABLE,
      KEYWORD,
      MEC,
      IDENT,
    ];
    return {
      name: "Lisp",
      illegal: /\S/,
      contains: [NUMBER, hljs.SHEBANG(), LITERAL, STRING, COMMENT, QUOTED, QUOTED_ATOM, LIST, IDENT],
    };
  }
  cjsModule.exports = lisp;
});
export { require_lisp };
