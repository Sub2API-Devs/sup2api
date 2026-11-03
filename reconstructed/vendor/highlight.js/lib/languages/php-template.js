/**
 * highlight.js/lib/languages/php-template.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:361952-362383 cjs-fingerprint
var Fi = x(function (Ag, Gi) {
  function Gp(e) {
    return {
      name: "PHP template",
      subLanguage: "xml",
      contains: [
        {
          begin: /<\?(php|=)?/,
          end: /\?>/,
          subLanguage: "php",
          contains: [
            { begin: "/\\*", end: "\\*/", skip: !0 },
            { begin: 'b"', end: '"', skip: !0 },
            { begin: "b'", end: "'", skip: !0 },
            e.inherit(e.APOS_STRING_MODE, { illegal: null, className: null, contains: null, skip: !0 }),
            e.inherit(e.QUOTE_STRING_MODE, { illegal: null, className: null, contains: null, skip: !0 }),
          ],
        },
      ],
    };
  }
  Gi.exports = Gp;
});

export { Fi };
