/**
 * highlight.js/lib/languages/julia-repl.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:219323-219540 cjs-fingerprint
var require_julia_repl = __commonJS(function (cjsExports, cjsModule) {
  function juliaRepl(hljs) {
    return {
      name: "Julia REPL",
      contains: [
        {
          className: "meta.prompt",
          begin: /^julia>/,
          relevance: 10,
          starts: {
            end: /^(?![ ]{6})/,
            subLanguage: "julia",
          },
        },
      ],
      aliases: ["jldoctest"],
    };
  }
  cjsModule.exports = juliaRepl;
});
export { require_julia_repl };
