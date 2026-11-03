/**
 * highlight.js/lib/languages/ldif.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:229395-229632 cjs-fingerprint
var Ar = x(function (qE, Sr) {
  function Kd(e) {
    return {
      name: "LDIF",
      contains: [
        { className: "attribute", match: "^dn(?=:)", relevance: 10 },
        { className: "attribute", match: "^\\w+(?=:)" },
        { className: "literal", match: "^-" },
        e.HASH_COMMENT_MODE,
      ],
    };
  }
  Sr.exports = Kd;
});

export { Ar };
