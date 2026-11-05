/**
 * highlight.js/lib/languages/shell.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:435514-435762 cjs-fingerprint
var require_shell = __commonJS(function (cjsExports, cjsModule) {
  function shell(hljs) {
    return {
      name: "Shell Session",
      aliases: ["console", "shellsession"],
      contains: [
        {
          className: "meta.prompt",
          begin: /^\s{0,3}[/~\w\d[\]()@-]*[>%$#][ ]?/,
          starts: {
            end: /[^\\](?=\s*$)/,
            subLanguage: "bash",
          },
        },
      ],
    };
  }
  cjsModule.exports = shell;
});
export { require_shell };
