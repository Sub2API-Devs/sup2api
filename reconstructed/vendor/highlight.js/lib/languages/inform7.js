/**
 * highlight.js/lib/languages/inform7.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:197504-198166 cjs-fingerprint
var require_inform7 = x(function (cjsExports, cjsModule) {
  function inform7(hljs) {
    return {
      name: "Inform 7",
      aliases: ["i7"],
      case_insensitive: true,
      keywords: {
        keyword:
          "thing room person man woman animal container supporter backdrop door scenery open closed locked inside gender is are say understand kind of rule",
      },
      contains: [
        {
          className: "string",
          begin: '"',
          end: '"',
          relevance: 0,
          contains: [
            {
              className: "subst",
              begin: "\\[",
              end: "\\]",
            },
          ],
        },
        {
          className: "section",
          begin: /^(Volume|Book|Part|Chapter|Section|Table)\b/,
          end: "$",
        },
        {
          begin: /^(Check|Carry out|Report|Instead of|To|Rule|When|Before|After)\b/,
          end: ":",
          contains: [
            {
              begin: "\\(This",
              end: "\\)",
            },
          ],
        },
        {
          className: "comment",
          begin: "\\[",
          end: "\\]",
          contains: ["self"],
        },
      ],
    };
  }
  cjsModule.exports = inform7;
});
export { require_inform7 };
