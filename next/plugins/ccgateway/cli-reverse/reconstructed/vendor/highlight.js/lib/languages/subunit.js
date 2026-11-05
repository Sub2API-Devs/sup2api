/**
 * highlight.js/lib/languages/subunit.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:482400-482907 cjs-fingerprint
var require_subunit = __commonJS(function (cjsExports, cjsModule) {
  function subunit(hljs) {
    return {
      name: "SubUnit",
      case_insensitive: true,
      contains: [
        {
          className: "string",
          begin: `\\[
(multipart)?`,
          end: `\\]
`,
        },
        {
          className: "string",
          begin: "\\d{4}-\\d{2}-\\d{2}(\\s+)\\d{2}:\\d{2}:\\d{2}.\\d+Z",
        },
        {
          className: "string",
          begin: "(\\+|-)\\d+",
        },
        {
          className: "keyword",
          relevance: 10,
          variants: [
            {
              begin: "^(test|testing|success|successful|failure|error|skip|xfail|uxsuccess)(:?)\\s+(test)?",
            },
            {
              begin: "^progress(:?)(\\s+)?(pop|push)?",
            },
            {
              begin: "^tags:",
            },
            {
              begin: "^time:",
            },
          ],
        },
      ],
    };
  }
  cjsModule.exports = subunit;
});
export { require_subunit };
