/**
 * highlight.js/lib/languages/graphql.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:180238-180972 cjs-fingerprint
var ha = x(function (NE, ya) {
  function Td(e) {
    let regex = e.regex,
      n = /[_A-Za-z][_0-9A-Za-z]*/;
    return {
      name: "GraphQL",
      aliases: ["gql"],
      case_insensitive: !0,
      disableAutodetect: !1,
      keywords: {
        keyword: [
          "query",
          "mutation",
          "subscription",
          "type",
          "input",
          "schema",
          "directive",
          "interface",
          "union",
          "scalar",
          "fragment",
          "enum",
          "on",
        ],
        literal: ["true", "false", "null"],
      },
      contains: [
        e.HASH_COMMENT_MODE,
        e.QUOTE_STRING_MODE,
        e.NUMBER_MODE,
        { scope: "punctuation", match: /[.]{3}/, relevance: 0 },
        { scope: "punctuation", begin: /[\!\(\)\:\=\[\]\{\|\}]{1}/, relevance: 0 },
        { scope: "variable", begin: /\$/, end: /\W/, excludeEnd: !0, relevance: 0 },
        { scope: "meta", match: /@\w+/, excludeEnd: !0 },
        { scope: "symbol", begin: regex.concat(n, regex.lookahead(/\s*:/)), relevance: 0 },
      ],
      illegal: [/[;<']/, /BEGIN/],
    };
  }
  ya.exports = Td;
});

export { ha };
