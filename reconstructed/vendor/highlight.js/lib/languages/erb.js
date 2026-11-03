/**
 * highlight.js/lib/languages/erb.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:130149-130357 cjs-fingerprint
var Zn = x(function (rE, Xn) {
  function td(e) {
    return {
      name: "ERB",
      subLanguage: "xml",
      contains: [
        e.COMMENT("<%#", "%>"),
        { begin: "<%[%=-]?", end: "[%-]?%>", subLanguage: "ruby", excludeBegin: !0, excludeEnd: !0 },
      ],
    };
  }
  Xn.exports = td;
});

export { Zn };
