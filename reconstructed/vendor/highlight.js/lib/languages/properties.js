/**
 * highlight.js/lib/languages/properties.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:373395-374067 cjs-fingerprint
var es = x(function (hg, ji) {
  function Vp(e) {
    let a = "[ \\t\\f]*[:=][ \\t\\f]*",
      s = "[ \\t\\f]+",
      o = "(" + a + "|[ \\t\\f]+)",
      r = "([^\\\\:= \\t\\f\\n]|\\\\.)+",
      i = {
        end: o,
        relevance: 0,
        starts: {
          className: "string",
          end: /$/,
          relevance: 0,
          contains: [{ begin: "\\\\\\\\" }, { begin: "\\\\\\n" }],
        },
      };
    return {
      name: ".properties",
      disableAutodetect: !0,
      case_insensitive: !0,
      illegal: /\S/,
      contains: [
        e.COMMENT("^\\s*[!#]", "$"),
        {
          returnBegin: !0,
          variants: [
            { begin: "([^\\\\:= \\t\\f\\n]|\\\\.)+" + a },
            { begin: "([^\\\\:= \\t\\f\\n]|\\\\.)+[ \\t\\f]+" },
          ],
          contains: [{ className: "attr", begin: "([^\\\\:= \\t\\f\\n]|\\\\.)+", endsParent: !0 }],
          starts: i,
        },
        { className: "attr", begin: "([^\\\\:= \\t\\f\\n]|\\\\.)+[ \\t\\f]*$" },
      ],
    };
  }
  ji.exports = Vp;
});

export { es };
