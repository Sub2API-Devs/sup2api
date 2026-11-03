/**
 * highlight.js/lib/languages/brainfuck.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:56769-57208 cjs-fingerprint
var require_brainfuck = x(function (cjsExports, cjsModule) {
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
