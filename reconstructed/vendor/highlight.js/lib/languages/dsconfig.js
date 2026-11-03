/**
 * highlight.js/lib/languages/dsconfig.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:123534-124117 cjs-fingerprint
var require_dsconfig = x(function (cjsExports, cjsModule) {
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
