/**
 * highlight.js/lib/languages/gherkin.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:167477-168007 cjs-fingerprint
var require_gherkin = __commonJS(function (cjsExports, cjsModule) {
  function gherkin(hljs) {
    return {
      name: "Gherkin",
      aliases: ["feature"],
      keywords:
        "Feature Background Ability Business Need Scenario Scenarios Scenario Outline Scenario Template Examples Given And Then But When",
      contains: [
        {
          className: "symbol",
          begin: "\\*",
          relevance: 0,
        },
        {
          className: "meta",
          begin: "@[^@\\s]+",
        },
        {
          begin: "\\|",
          end: "\\|\\w*$",
          contains: [
            {
              className: "string",
              begin: "[^|]+",
            },
          ],
        },
        {
          className: "variable",
          begin: "<",
          end: ">",
        },
        hljs.HASH_COMMENT_MODE,
        {
          className: "string",
          begin: '"""',
          end: '"""',
        },
        hljs.QUOTE_STRING_MODE,
      ],
    };
  }
  cjsModule.exports = gherkin;
});
export { require_gherkin };
