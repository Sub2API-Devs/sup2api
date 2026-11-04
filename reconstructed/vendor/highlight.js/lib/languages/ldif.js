/**
 * highlight.js/lib/languages/ldif.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:229395-229632 cjs-fingerprint
var require_ldif = __commonJS(function (cjsExports, cjsModule) {
  function ldif(hljs) {
    return {
      name: "LDIF",
      contains: [
        {
          className: "attribute",
          match: "^dn(?=:)",
          relevance: 10,
        },
        {
          className: "attribute",
          match: "^\\w+(?=:)",
        },
        {
          className: "literal",
          match: "^-",
        },
        hljs.HASH_COMMENT_MODE,
      ],
    };
  }
  cjsModule.exports = ldif;
});
export { require_ldif };
