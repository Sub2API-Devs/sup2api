/**
 * highlight.js/lib/languages/diff.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:117631-118155 cjs-fingerprint
var require_diff = __commonJS(function (cjsExports, cjsModule) {
  function diff(hljs) {
    let regex = hljs.regex;
    return {
      name: "Diff",
      aliases: ["patch"],
      contains: [
        {
          className: "meta",
          relevance: 10,
          match: regex.either(
            /^@@ +-\d+,\d+ +\+\d+,\d+ +@@/,
            /^\*\*\* +\d+,\d+ +\*\*\*\*$/,
            /^--- +\d+,\d+ +----$/,
          ),
        },
        {
          className: "comment",
          variants: [
            {
              begin: regex.either(/Index: /, /^index/, /={3,}/, /^-{3}/, /^\*{3} /, /^\+{3}/, /^diff --git/),
              end: /$/,
            },
            {
              match: /^\*{15}$/,
            },
          ],
        },
        {
          className: "addition",
          begin: /^\+/,
          end: /$/,
        },
        {
          className: "deletion",
          begin: /^-/,
          end: /$/,
        },
        {
          className: "addition",
          begin: /^!/,
          end: /$/,
        },
      ],
    };
  }
  cjsModule.exports = diff;
});
export { require_diff };
