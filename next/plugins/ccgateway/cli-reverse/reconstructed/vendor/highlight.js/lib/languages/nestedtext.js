/**
 * highlight.js/lib/languages/nestedtext.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:308874-309437 cjs-fingerprint
var require_nestedtext = __commonJS(function (cjsExports, cjsModule) {
  function nestedtext(hljs) {
    let NESTED = {
      match: [/^\s*(?=\S)/, /[^:]+/, /:\s*/, /$/],
      className: {
        2: "attribute",
        3: "punctuation",
      },
    };
    let DICTIONARY_ITEM = {
      match: [/^\s*(?=\S)/, /[^:]*[^: ]/, /[ ]*:/, /[ ]/, /.*$/],
      className: {
        2: "attribute",
        3: "punctuation",
        5: "string",
      },
    };
    let STRING = {
      match: [/^\s*/, />/, /[ ]/, /.*$/],
      className: {
        2: "punctuation",
        4: "string",
      },
    };
    let LIST_ITEM = {
      variants: [
        {
          match: [/^\s*/, /-/, /[ ]/, /.*$/],
        },
        {
          match: [/^\s*/, /-$/],
        },
      ],
      className: {
        2: "bullet",
        4: "string",
      },
    };
    return {
      name: "Nested Text",
      aliases: ["nt"],
      contains: [
        hljs.inherit(hljs.HASH_COMMENT_MODE, {
          begin: /^\s*(?=#)/,
          excludeBegin: true,
        }),
        LIST_ITEM,
        STRING,
        NESTED,
        DICTIONARY_ITEM,
      ],
    };
  }
  cjsModule.exports = nestedtext;
});
export { require_nestedtext };
