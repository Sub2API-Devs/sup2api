/**
 * highlight.js/lib/languages/roboconf.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:394033-394771 cjs-fingerprint
var require_roboconf = __commonJS(function (cjsExports, cjsModule) {
  function roboconf(hljs) {
    let PROPERTY = {
      className: "attribute",
      begin: /[a-zA-Z-_]+/,
      end: /\s*:/,
      excludeEnd: true,
      starts: {
        end: ";",
        relevance: 0,
        contains: [
          {
            className: "variable",
            begin: /\.[a-zA-Z-_]+/,
          },
          {
            className: "keyword",
            begin: /\(optional\)/,
          },
        ],
      },
    };
    return {
      name: "Roboconf",
      aliases: ["graph", "instances"],
      case_insensitive: true,
      keywords: "import",
      contains: [
        {
          begin: "^facet [a-zA-Z-_][^\\n{]+\\{",
          end: /\}/,
          keywords: "facet",
          contains: [PROPERTY, hljs.HASH_COMMENT_MODE],
        },
        {
          begin: "^\\s*instance of [a-zA-Z-_][^\\n{]+\\{",
          end: /\}/,
          keywords: "name count channels instance-data instance-state instance of",
          illegal: /\S/,
          contains: ["self", PROPERTY, hljs.HASH_COMMENT_MODE],
        },
        {
          begin: "^[a-zA-Z-_][^\\n{]+\\{",
          end: /\}/,
          contains: [PROPERTY, hljs.HASH_COMMENT_MODE],
        },
        hljs.HASH_COMMENT_MODE,
      ],
    };
  }
  cjsModule.exports = roboconf;
});
export { require_roboconf };
