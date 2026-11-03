/**
 * highlight.js/lib/languages/apache.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:7127-8101 cjs-fingerprint
var lt = x(function (pu, ct) {
  function Wc(e) {
    let t = { className: "number", begin: /[$%]\d+/ },
      n = { className: "number", begin: /\b\d+/ },
      a = { className: "number", begin: /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d{1,5})?/ },
      s = { className: "number", begin: /:\d{1,5}/ };
    return {
      name: "Apache config",
      aliases: ["apacheconf"],
      case_insensitive: !0,
      contains: [
        e.HASH_COMMENT_MODE,
        {
          className: "section",
          begin: /<\/?/,
          end: />/,
          contains: [a, s, e.inherit(e.QUOTE_STRING_MODE, { relevance: 0 })],
        },
        {
          className: "attribute",
          begin: /\w+/,
          relevance: 0,
          keywords: {
            _: [
              "order",
              "deny",
              "allow",
              "setenv",
              "rewriterule",
              "rewriteengine",
              "rewritecond",
              "documentroot",
              "sethandler",
              "errordocument",
              "loadmodule",
              "options",
              "header",
              "listen",
              "serverroot",
              "servername",
            ],
          },
          starts: {
            end: /$/,
            relevance: 0,
            keywords: { literal: "on off all deny allow" },
            contains: [
              { scope: "punctuation", match: /\\\n/ },
              { className: "meta", begin: /\s\[/, end: /\]$/ },
              { className: "variable", begin: /[\$%]\{/, end: /\}/, contains: ["self", t] },
              a,
              n,
              e.QUOTE_STRING_MODE,
            ],
          },
        },
      ],
      illegal: /\S/,
    };
  }
  ct.exports = Wc;
});

export { lt };
