/**
 * highlight.js/lib/languages/mojolicious.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:301777-302076 cjs-fingerprint
var require_mojolicious = __commonJS(function (cjsExports, cjsModule) {
  function mojolicious(hljs) {
    return {
      name: "Mojolicious",
      subLanguage: "xml",
      contains: [
        {
          className: "meta",
          begin: "^__(END|DATA)__$",
        },
        {
          begin: "^\\s*%{1,2}={0,2}",
          end: "$",
          subLanguage: "perl",
        },
        {
          begin: "<%{1,2}={0,2}",
          end: "={0,1}%>",
          subLanguage: "perl",
          excludeBegin: true,
          excludeEnd: true,
        },
      ],
    };
  }
  cjsModule.exports = mojolicious;
});
export { require_mojolicious };
