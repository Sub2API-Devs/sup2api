/**
 * highlight.js/lib/languages/fix.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:139327-139720 cjs-fingerprint
var ra = x(function (cE, aa) {
  function id(e) {
    return {
      name: "FIX",
      contains: [
        {
          begin: /[^\u2401\u0001]+/,
          end: /[\u2401\u0001]/,
          excludeEnd: !0,
          returnBegin: !0,
          returnEnd: !1,
          contains: [
            {
              begin: /([^\u2401\u0001=]+)/,
              end: /=([^\u2401\u0001=]+)/,
              returnEnd: !0,
              returnBegin: !1,
              className: "attr",
            },
            { begin: /=/, end: /([\u2401\u0001])/, excludeEnd: !0, excludeBegin: !0, className: "string" },
          ],
        },
      ],
      case_insensitive: !0,
    };
  }
  aa.exports = id;
});

export { ra };
