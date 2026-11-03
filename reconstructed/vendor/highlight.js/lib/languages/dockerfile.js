/**
 * highlight.js/lib/languages/dockerfile.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:121731-122157 cjs-fingerprint
var xn = x(function (Zu, wn) {
  function Wl(e) {
    return {
      name: "Dockerfile",
      aliases: ["docker"],
      case_insensitive: !0,
      keywords: ["from", "maintainer", "expose", "env", "arg", "user", "onbuild", "stopsignal"],
      contains: [
        e.HASH_COMMENT_MODE,
        e.APOS_STRING_MODE,
        e.QUOTE_STRING_MODE,
        e.NUMBER_MODE,
        {
          beginKeywords: "run cmd entrypoint volume add copy workdir label healthcheck shell",
          starts: { end: /[^\\]$/, subLanguage: "bash" },
        },
      ],
      illegal: "</",
    };
  }
  wn.exports = Wl;
});

export { xn };
