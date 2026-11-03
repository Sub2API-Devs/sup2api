/**
 * highlight.js/lib/languages/roboconf.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:394033-394771 cjs-fingerprint
var As = x(function (Fg, Ss) {
  function am(e) {
    let n = {
      className: "attribute",
      begin: /[a-zA-Z-_]+/,
      end: /\s*:/,
      excludeEnd: !0,
      starts: {
        end: ";",
        relevance: 0,
        contains: [
          { className: "variable", begin: /\.[a-zA-Z-_]+/ },
          { className: "keyword", begin: /\(optional\)/ },
        ],
      },
    };
    return {
      name: "Roboconf",
      aliases: ["graph", "instances"],
      case_insensitive: !0,
      keywords: "import",
      contains: [
        {
          begin: "^facet [a-zA-Z-_][^\\n{]+\\{",
          end: /\}/,
          keywords: "facet",
          contains: [n, e.HASH_COMMENT_MODE],
        },
        {
          begin: "^\\s*instance of [a-zA-Z-_][^\\n{]+\\{",
          end: /\}/,
          keywords: "name count channels instance-data instance-state instance of",
          illegal: /\S/,
          contains: ["self", n, e.HASH_COMMENT_MODE],
        },
        { begin: "^[a-zA-Z-_][^\\n{]+\\{", end: /\}/, contains: [n, e.HASH_COMMENT_MODE] },
        e.HASH_COMMENT_MODE,
      ],
    };
  }
  Ss.exports = am;
});

export { As };
