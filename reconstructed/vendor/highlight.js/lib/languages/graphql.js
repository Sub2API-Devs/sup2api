/**
 * highlight.js/lib/languages/graphql.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:180238-180972 cjs-fingerprint
var require_graphql = x(function (cjsExports, cjsModule) {
  function graphql(hljs) {
    let regex = hljs.regex;
    let GQL_NAME = /[_A-Za-z][_0-9A-Za-z]*/;
    return {
      name: "GraphQL",
      aliases: ["gql"],
      case_insensitive: true,
      disableAutodetect: false,
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
        hljs.HASH_COMMENT_MODE,
        hljs.QUOTE_STRING_MODE,
        hljs.NUMBER_MODE,
        {
          scope: "punctuation",
          match: /[.]{3}/,
          relevance: 0,
        },
        {
          scope: "punctuation",
          begin: /[\!\(\)\:\=\[\]\{\|\}]{1}/,
          relevance: 0,
        },
        {
          scope: "variable",
          begin: /\$/,
          end: /\W/,
          excludeEnd: true,
          relevance: 0,
        },
        {
          scope: "meta",
          match: /@\w+/,
          excludeEnd: true,
        },
        {
          scope: "symbol",
          begin: regex.concat(GQL_NAME, regex.lookahead(/\s*:/)),
          relevance: 0,
        },
      ],
      illegal: [/[;<']/, /BEGIN/],
    };
  }
  cjsModule.exports = graphql;
});
export { require_graphql };
