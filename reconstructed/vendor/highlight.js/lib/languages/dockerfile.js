/**
 * highlight.js/lib/languages/dockerfile.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:121731-122157 cjs-fingerprint
var require_dockerfile = x(function (cjsExports, cjsModule) {
  function dockerfile(hljs) {
    return {
      name: "Dockerfile",
      aliases: ["docker"],
      case_insensitive: true,
      keywords: ["from", "maintainer", "expose", "env", "arg", "user", "onbuild", "stopsignal"],
      contains: [
        hljs.HASH_COMMENT_MODE,
        hljs.APOS_STRING_MODE,
        hljs.QUOTE_STRING_MODE,
        hljs.NUMBER_MODE,
        {
          beginKeywords: "run cmd entrypoint volume add copy workdir label healthcheck shell",
          starts: {
            end: /[^\\]$/,
            subLanguage: "bash",
          },
        },
      ],
      illegal: "</",
    };
  }
  cjsModule.exports = dockerfile;
});
export { require_dockerfile };
