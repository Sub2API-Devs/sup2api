/**
 * highlight.js/lib/languages/graphql.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:180238-180972 cjs-fingerprint
var require_graphql = __commonJS(function (cjsExports, cjsModule) {
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
