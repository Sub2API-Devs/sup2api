/**
 * highlight.js/lib/languages/ini.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:198166-199129 cjs-fingerprint
var require_ini = __commonJS(function (cjsExports, cjsModule) {
  function ini(hljs) {
    let regex = hljs.regex;
    let NUMBERS = {
      className: "number",
      relevance: 0,
      variants: [
        {
          begin: /([+-]+)?[\d]+_[\d_]+/,
        },
        {
          begin: hljs.NUMBER_RE,
        },
      ],
    };
    let COMMENTS = hljs.COMMENT();
    COMMENTS.variants = [
      {
        begin: /;/,
        end: /$/,
      },
      {
        begin: /#/,
        end: /$/,
      },
    ];
    let VARIABLES = {
      className: "variable",
      variants: [
        {
          begin: /\$[\w\d"][\w\d_]*/,
        },
        {
          begin: /\$\{(.*?)\}/,
        },
      ],
    };
    let LITERALS = {
      className: "literal",
      begin: /\bon|off|true|false|yes|no\b/,
    };
    let STRINGS = {
      className: "string",
      contains: [hljs.BACKSLASH_ESCAPE],
      variants: [
        {
          begin: "'''",
          end: "'''",
          relevance: 10,
        },
        {
          begin: '"""',
          end: '"""',
          relevance: 10,
        },
        {
          begin: '"',
          end: '"',
        },
        {
          begin: "'",
          end: "'",
        },
      ],
    };
    let ARRAY = {
      begin: /\[/,
      end: /\]/,
      contains: [COMMENTS, LITERALS, VARIABLES, STRINGS, NUMBERS, "self"],
      relevance: 0,
    };
    let BARE_KEY = /[A-Za-z0-9_-]+/;
    let QUOTED_KEY_DOUBLE_QUOTE = /"(\\"|[^"])*"/;
    let QUOTED_KEY_SINGLE_QUOTE = /'[^']*'/;
    let ANY_KEY = regex.either(BARE_KEY, QUOTED_KEY_DOUBLE_QUOTE, QUOTED_KEY_SINGLE_QUOTE);
    let DOTTED_KEY = regex.concat(ANY_KEY, "(\\s*\\.\\s*", ANY_KEY, ")*", regex.lookahead(/\s*=\s*[^#\s]/));
    return {
      name: "TOML, also INI",
      aliases: ["toml"],
      case_insensitive: true,
      illegal: /\S/,
      contains: [
        COMMENTS,
        {
          className: "section",
          begin: /\[+/,
          end: /\]+/,
        },
        {
          begin: DOTTED_KEY,
          className: "attr",
          starts: {
            end: /$/,
            contains: [COMMENTS, ARRAY, LITERALS, VARIABLES, STRINGS, NUMBERS],
          },
        },
      ],
    };
  }
  cjsModule.exports = ini;
});
export { require_ini };
