/**
 * highlight.js/lib/languages/leaf.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:229632-230327 cjs-fingerprint
var require_leaf = x(function (cjsExports, cjsModule) {
  function leaf(hljs) {
    let IDENT = /([A-Za-z_][A-Za-z_0-9]*)?/;
    let PARAMS = {
      scope: "params",
      begin: /\(/,
      end: /\)(?=\:?)/,
      endsParent: true,
      relevance: 7,
      contains: [
        {
          scope: "string",
          begin: '"',
          end: '"',
        },
        {
          scope: "keyword",
          match: ["true", "false", "in"].join("|"),
        },
        {
          scope: "variable",
          match: /[A-Za-z_][A-Za-z_0-9]*/,
        },
        {
          scope: "operator",
          match: /\+|\-|\*|\/|\%|\=\=|\=|\!|\>|\<|\&\&|\|\|/,
        },
      ],
    };
    let INSIDE_DISPATCH = {
      match: [IDENT, /(?=\()/],
      scope: {
        1: "keyword",
      },
      contains: [PARAMS],
    };
    PARAMS.contains.unshift(INSIDE_DISPATCH);
    return {
      name: "Leaf",
      contains: [
        {
          match: [/#+/, IDENT, /(?=\()/],
          scope: {
            1: "punctuation",
            2: "keyword",
          },
          starts: {
            contains: [
              {
                match: /\:/,
                scope: "punctuation",
              },
            ],
          },
          contains: [PARAMS],
        },
        {
          match: [/#+/, IDENT, /:?/],
          scope: {
            1: "punctuation",
            2: "keyword",
            3: "punctuation",
          },
        },
      ],
    };
  }
  cjsModule.exports = leaf;
});
export { require_leaf };
