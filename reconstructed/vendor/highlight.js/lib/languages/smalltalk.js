/**
 * highlight.js/lib/languages/smalltalk.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:436855-437512 cjs-fingerprint
var require_smalltalk = __commonJS(function (cjsExports, cjsModule) {
  function smalltalk(hljs) {
    let CHAR = {
      className: "string",
      begin: "\\$.{1}",
    };
    let SYMBOL = {
      className: "symbol",
      begin: "#" + hljs.UNDERSCORE_IDENT_RE,
    };
    return {
      name: "Smalltalk",
      aliases: ["st"],
      keywords: ["self", "super", "nil", "true", "false", "thisContext"],
      contains: [
        hljs.COMMENT('"', '"'),
        hljs.APOS_STRING_MODE,
        {
          className: "type",
          begin: "\\b[A-Z][A-Za-z0-9_]*",
          relevance: 0,
        },
        {
          begin: "[a-z][a-zA-Z0-9_]*:",
          relevance: 0,
        },
        hljs.C_NUMBER_MODE,
        SYMBOL,
        CHAR,
        {
          begin: "\\|[ ]*[a-z][a-zA-Z0-9_]*([ ]+[a-z][a-zA-Z0-9_]*)*[ ]*\\|",
          returnBegin: true,
          end: /\|/,
          illegal: /\S/,
          contains: [
            {
              begin: "(\\|[ ]*)?[a-z][a-zA-Z0-9_]*",
            },
          ],
        },
        {
          begin: "#\\(",
          end: "\\)",
          contains: [hljs.APOS_STRING_MODE, CHAR, hljs.C_NUMBER_MODE, SYMBOL],
        },
      ],
    };
  }
  cjsModule.exports = smalltalk;
});
export { require_smalltalk };
