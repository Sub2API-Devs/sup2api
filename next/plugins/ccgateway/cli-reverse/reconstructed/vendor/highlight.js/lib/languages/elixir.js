/**
 * highlight.js/lib/languages/elixir.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:126377-128976 cjs-fingerprint
var require_elixir = __commonJS(function (cjsExports, cjsModule) {
  function elixir(hljs) {
    let regex = hljs.regex;
    let ELIXIR_IDENT_RE = "[a-zA-Z_][a-zA-Z0-9_.]*(!|\\?)?";
    let ELIXIR_METHOD_RE = "[a-zA-Z_]\\w*[!?=]?|[-+~]@|<<|>>|=~|===?|<=>|[<>]=?|\\*\\*|[-/+%^&*~`|]|\\[\\]=?";
    let KWS = {
      $pattern: "[a-zA-Z_][a-zA-Z0-9_.]*(!|\\?)?",
      keyword: [
        "after",
        "alias",
        "and",
        "case",
        "catch",
        "cond",
        "defstruct",
        "defguard",
        "do",
        "else",
        "end",
        "fn",
        "for",
        "if",
        "import",
        "in",
        "not",
        "or",
        "quote",
        "raise",
        "receive",
        "require",
        "reraise",
        "rescue",
        "try",
        "unless",
        "unquote",
        "unquote_splicing",
        "use",
        "when",
        "with|0",
      ],
      literal: ["false", "nil", "true"],
    };
    let SUBST = {
      className: "subst",
      begin: /#\{/,
      end: /\}/,
      keywords: KWS,
    };
    let NUMBER = {
      className: "number",
      begin:
        "(\\b0o[0-7_]+)|(\\b0b[01_]+)|(\\b0x[0-9a-fA-F_]+)|(-?\\b[0-9][0-9_]*(\\.[0-9_]+([eE][-+]?[0-9]+)?)?)",
      relevance: 0,
    };
    let BACKSLASH_ESCAPE = {
      match: /\\[\s\S]/,
      scope: "char.escape",
      relevance: 0,
    };
    let SIGIL_DELIMITERS = `[/|([{<"']`;
    let SIGIL_DELIMITER_MODES = [
      {
        begin: /"/,
        end: /"/,
      },
      {
        begin: /'/,
        end: /'/,
      },
      {
        begin: /\//,
        end: /\//,
      },
      {
        begin: /\|/,
        end: /\|/,
      },
      {
        begin: /\(/,
        end: /\)/,
      },
      {
        begin: /\[/,
        end: /\]/,
      },
      {
        begin: /\{/,
        end: /\}/,
      },
      {
        begin: /</,
        end: />/,
      },
    ];
    let escapeSigilEnd = (end) => ({
      scope: "char.escape",
      begin: regex.concat(/\\/, end),
      relevance: 0,
    });
    let LOWERCASE_SIGIL = {
      className: "string",
      begin: `~[a-z](?=[/|([{<"'])`,
      contains: SIGIL_DELIMITER_MODES.map((x) =>
        hljs.inherit(x, {
          contains: [escapeSigilEnd(x.end), BACKSLASH_ESCAPE, SUBST],
        }),
      ),
    };
    let UPCASE_SIGIL = {
      className: "string",
      begin: `~[A-Z](?=[/|([{<"'])`,
      contains: SIGIL_DELIMITER_MODES.map((x) =>
        hljs.inherit(x, {
          contains: [escapeSigilEnd(x.end)],
        }),
      ),
    };
    let REGEX_SIGIL = {
      className: "regex",
      variants: [
        {
          begin: `~r(?=[/|([{<"'])`,
          contains: SIGIL_DELIMITER_MODES.map((x) =>
            hljs.inherit(x, {
              end: regex.concat(x.end, /[uismxfU]{0,7}/),
              contains: [escapeSigilEnd(x.end), BACKSLASH_ESCAPE, SUBST],
            }),
          ),
        },
        {
          begin: `~R(?=[/|([{<"'])`,
          contains: SIGIL_DELIMITER_MODES.map((x) =>
            hljs.inherit(x, {
              end: regex.concat(x.end, /[uismxfU]{0,7}/),
              contains: [escapeSigilEnd(x.end)],
            }),
          ),
        },
      ],
    };
    let STRING = {
      className: "string",
      contains: [hljs.BACKSLASH_ESCAPE, SUBST],
      variants: [
        {
          begin: /"""/,
          end: /"""/,
        },
        {
          begin: /'''/,
          end: /'''/,
        },
        {
          begin: /~S"""/,
          end: /"""/,
          contains: [],
        },
        {
          begin: /~S"/,
          end: /"/,
          contains: [],
        },
        {
          begin: /~S'''/,
          end: /'''/,
          contains: [],
        },
        {
          begin: /~S'/,
          end: /'/,
          contains: [],
        },
        {
          begin: /'/,
          end: /'/,
        },
        {
          begin: /"/,
          end: /"/,
        },
      ],
    };
    let FUNCTION = {
      className: "function",
      beginKeywords: "def defp defmacro defmacrop",
      end: /\B\b/,
      contains: [
        hljs.inherit(hljs.TITLE_MODE, {
          begin: "[a-zA-Z_][a-zA-Z0-9_.]*(!|\\?)?",
          endsParent: true,
        }),
      ],
    };
    let CLASS = hljs.inherit(FUNCTION, {
      className: "class",
      beginKeywords: "defimpl defmodule defprotocol defrecord",
      end: /\bdo\b|$|;/,
    });
    let ELIXIR_DEFAULT_CONTAINS = [
      STRING,
      REGEX_SIGIL,
      UPCASE_SIGIL,
      LOWERCASE_SIGIL,
      hljs.HASH_COMMENT_MODE,
      CLASS,
      FUNCTION,
      {
        begin: "::",
      },
      {
        className: "symbol",
        begin: ":(?![\\s:])",
        contains: [
          STRING,
          {
            begin: "[a-zA-Z_]\\w*[!?=]?|[-+~]@|<<|>>|=~|===?|<=>|[<>]=?|\\*\\*|[-/+%^&*~`|]|\\[\\]=?",
          },
        ],
        relevance: 0,
      },
      {
        className: "symbol",
        begin: "[a-zA-Z_][a-zA-Z0-9_.]*(!|\\?)?:(?!:)",
        relevance: 0,
      },
      {
        className: "title.class",
        begin: /(\b[A-Z][a-zA-Z0-9_]+)/,
        relevance: 0,
      },
      NUMBER,
      {
        className: "variable",
        begin: "(\\$\\W)|((\\$|@@?)(\\w+))",
      },
    ];
    SUBST.contains = ELIXIR_DEFAULT_CONTAINS;
    return {
      name: "Elixir",
      aliases: ["ex", "exs"],
      keywords: KWS,
      contains: ELIXIR_DEFAULT_CONTAINS,
    };
  }
  cjsModule.exports = elixir;
});
export { require_elixir };
