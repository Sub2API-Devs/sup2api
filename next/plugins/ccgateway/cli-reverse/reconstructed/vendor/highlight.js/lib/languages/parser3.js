/**
 * highlight.js/lib/languages/parser3.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:330060-330609 cjs-fingerprint
var require_parser3 = __commonJS(function (cjsExports, cjsModule) {
  function parser3(hljs) {
    let CURLY_SUBCOMMENT = hljs.COMMENT(/\{/, /\}/, {
      contains: ["self"],
    });
    return {
      name: "Parser3",
      subLanguage: "xml",
      relevance: 0,
      contains: [
        hljs.COMMENT("^#", "$"),
        hljs.COMMENT(/\^rem\{/, /\}/, {
          relevance: 10,
          contains: [CURLY_SUBCOMMENT],
        }),
        {
          className: "meta",
          begin: "^@(?:BASE|USE|CLASS|OPTIONS)$",
          relevance: 10,
        },
        {
          className: "title",
          begin: "@[\\w\\-]+\\[[\\w^;\\-]*\\](?:\\[[\\w^;\\-]*\\])?(?:.*)$",
        },
        {
          className: "variable",
          begin: /\$\{?[\w\-.:]+\}?/,
        },
        {
          className: "keyword",
          begin: /\^[\w\-.:]+/,
        },
        {
          className: "number",
          begin: "\\^#[0-9a-fA-F]+",
        },
        hljs.C_NUMBER_MODE,
      ],
    };
  }
  cjsModule.exports = parser3;
});
export { require_parser3 };
