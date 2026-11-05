/**
 * highlight.js/lib/languages/brainfuck.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:56769-57208 cjs-fingerprint
var require_brainfuck = __commonJS(function (cjsExports, cjsModule) {
  function brainfuck(hljs) {
    let LITERAL = {
      className: "literal",
      begin: /[+-]+/,
      relevance: 0,
    };
    return {
      name: "Brainfuck",
      aliases: ["bf"],
      contains: [
        hljs.COMMENT(/[^\[\]\.,\+\-<> \r\n]/, /[\[\]\.,\+\-<> \r\n]/, {
          contains: [
            {
              match: /[ ]+[^\[\]\.,\+\-<> \r\n]/,
              relevance: 0,
            },
          ],
          returnEnd: true,
          relevance: 0,
        }),
        {
          className: "title",
          begin: "[\\[\\]]",
          relevance: 0,
        },
        {
          className: "string",
          begin: "[\\.,]",
          relevance: 0,
        },
        {
          begin: /(?=\+\+|--)/,
          contains: [LITERAL],
        },
        LITERAL,
      ],
    };
  }
  cjsModule.exports = brainfuck;
});
export { require_brainfuck };
