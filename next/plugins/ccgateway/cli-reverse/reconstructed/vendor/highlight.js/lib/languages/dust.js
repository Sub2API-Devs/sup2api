/**
 * highlight.js/lib/languages/dust.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:125540-125988 cjs-fingerprint
var require_dust = __commonJS(function (cjsExports, cjsModule) {
  function dust(hljs) {
    return {
      name: "Dust",
      aliases: ["dst"],
      case_insensitive: true,
      subLanguage: "xml",
      contains: [
        {
          className: "template-tag",
          begin: /\{[#\/]/,
          end: /\}/,
          illegal: /;/,
          contains: [
            {
              className: "name",
              begin: /[a-zA-Z\.-]+/,
              starts: {
                endsWithParent: true,
                relevance: 0,
                contains: [hljs.QUOTE_STRING_MODE],
              },
            },
          ],
        },
        {
          className: "template-variable",
          begin: /\{/,
          end: /\}/,
          illegal: /;/,
          keywords: "if eq ne lt lte gt gte select default math sep",
        },
      ],
    };
  }
  cjsModule.exports = dust;
});
export { require_dust };
