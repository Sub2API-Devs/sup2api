/**
 * highlight.js/lib/languages/node-repl.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:316237-316476 cjs-fingerprint
var require_node_repl = x(function (cjsExports, cjsModule) {
  function nodeRepl(hljs) {
    return {
      name: "Node REPL",
      contains: [
        {
          className: "meta.prompt",
          starts: {
            end: / |$/,
            starts: {
              end: "$",
              subLanguage: "javascript",
            },
          },
          variants: [
            {
              begin: /^>(?=[ ]|$)/,
            },
            {
              begin: /^\.\.\.(?=[ ]|$)/,
            },
          ],
        },
      ],
    };
  }
  cjsModule.exports = nodeRepl;
});
export { require_node_repl };
