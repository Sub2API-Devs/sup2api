/**
 * highlight.js/lib/languages/abnf.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:304-981 cjs-fingerprint
var require_abnf = __commonJS(function (cjsExports, cjsModule) {
  function abnf(hljs) {
    let regex = hljs.regex;
    let IDENT = /^[a-zA-Z][a-zA-Z0-9-]*/;
    let KEYWORDS = [
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
    ];
    let COMMENT = hljs.COMMENT(/;/, /$/);
    let TERMINAL_BINARY = {
      scope: "symbol",
      match: /%b[0-1]+(-[0-1]+|(\.[0-1]+)+)?/,
    };
    let TERMINAL_DECIMAL = {
      scope: "symbol",
      match: /%d[0-9]+(-[0-9]+|(\.[0-9]+)+)?/,
    };
    let TERMINAL_HEXADECIMAL = {
      scope: "symbol",
      match: /%x[0-9A-F]+(-[0-9A-F]+|(\.[0-9A-F]+)+)?/,
    };
    let CASE_SENSITIVITY = {
      scope: "symbol",
      match: /%[si](?=".*")/,
    };
    let RULE_DECLARATION = {
      scope: "attribute",
      match: regex.concat(IDENT, /(?=\s*=)/),
    };
    return {
      name: "Augmented Backus-Naur Form",
      illegal: /[!@#$^&',?+~`|:]/,
      keywords: KEYWORDS,
      contains: [
        {
          scope: "operator",
          match: /=\/?/,
        },
        RULE_DECLARATION,
        COMMENT,
        TERMINAL_BINARY,
        TERMINAL_DECIMAL,
        TERMINAL_HEXADECIMAL,
        CASE_SENSITIVITY,
        hljs.QUOTE_STRING_MODE,
        hljs.NUMBER_MODE,
      ],
    };
  }
  cjsModule.exports = abnf;
});
export { require_abnf };
