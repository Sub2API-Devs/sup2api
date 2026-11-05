/**
 * highlight.js/lib/languages/dsconfig.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:123534-124117 cjs-fingerprint
var require_dsconfig = __commonJS(function (cjsExports, cjsModule) {
  function dsconfig(hljs) {
    return {
      keywords: "dsconfig",
      contains: [
        {
          className: "keyword",
          begin: "^dsconfig",
          end: /\s/,
          excludeEnd: true,
          relevance: 10,
        },
        {
          className: "built_in",
          begin: /(list|create|get|set|delete)-(\w+)/,
          end: /\s/,
          excludeEnd: true,
          illegal: "!@#$%^&*()",
          relevance: 10,
        },
        {
          className: "built_in",
          begin: /--(\w+)/,
          end: /\s/,
          excludeEnd: true,
        },
        {
          className: "string",
          begin: /"/,
          end: /"/,
        },
        {
          className: "string",
          begin: /'/,
          end: /'/,
        },
        {
          className: "string",
          begin: /[\w\-?]+:\w+/,
          end: /\W/,
          relevance: 0,
        },
        {
          className: "string",
          begin: /\w+(\-\w+)*/,
          end: /(?=\W)/,
          relevance: 0,
        },
        hljs.HASH_COMMENT_MODE,
      ],
    };
  }
  cjsModule.exports = dsconfig;
});
export { require_dsconfig };
