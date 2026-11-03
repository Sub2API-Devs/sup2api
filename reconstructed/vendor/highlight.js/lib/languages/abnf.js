/**
 * highlight.js/lib/languages/abnf.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:304-981 cjs-fingerprint
var je = x(function (su, Je) {
  function Hc(e) {
    let regex = e.regex,
      n = /^[a-zA-Z][a-zA-Z0-9-]*/,
      a = [
        "ALPHA",
        "BIT",
        "CHAR",
        "CR",
        "CRLF",
        "CTL",
        "DIGIT",
        "DQUOTE",
        "HEXDIG",
        "HTAB",
        "LF",
        "LWSP",
        "OCTET",
        "SP",
        "VCHAR",
        "WSP",
      ],
      COMMENT = e.COMMENT(/;/, /$/),
      o = { scope: "symbol", match: /%b[0-1]+(-[0-1]+|(\.[0-1]+)+)?/ },
      r = { scope: "symbol", match: /%d[0-9]+(-[0-9]+|(\.[0-9]+)+)?/ },
      i = { scope: "symbol", match: /%x[0-9A-F]+(-[0-9A-F]+|(\.[0-9A-F]+)+)?/ },
      c = { scope: "symbol", match: /%[si](?=".*")/ },
      l = { scope: "attribute", match: regex.concat(n, /(?=\s*=)/) };
    return {
      name: "Augmented Backus-Naur Form",
      illegal: /[!@#$^&',?+~`|:]/,
      keywords: a,
      contains: [
        { scope: "operator", match: /=\/?/ },
        l,
        COMMENT,
        o,
        r,
        i,
        c,
        e.QUOTE_STRING_MODE,
        e.NUMBER_MODE,
      ],
    };
  }
  Je.exports = Hc;
});

export { je };
