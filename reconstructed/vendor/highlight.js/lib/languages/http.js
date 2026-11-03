/**
 * highlight.js/lib/languages/http.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:193632-194529 cjs-fingerprint
var $a = x(function (CE, Ha) {
  function Id(e) {
    let regex = e.regex,
      n = "HTTP/([32]|1\\.[01])",
      a = /[A-Za-z][A-Za-z0-9-]*/,
      s = {
        className: "attribute",
        begin: regex.concat("^", a, "(?=\\:\\s)"),
        starts: {
          contains: [
            { className: "punctuation", begin: /: /, relevance: 0, starts: { end: "$", relevance: 0 } },
          ],
        },
      },
      o = [s, { begin: "\\n\\n", starts: { subLanguage: [], endsWithParent: !0 } }];
    return {
      name: "HTTP",
      aliases: ["https"],
      illegal: /\S/,
      contains: [
        {
          begin: "^(?=HTTP/([32]|1\\.[01]) \\d{3})",
          end: /$/,
          contains: [
            { className: "meta", begin: "HTTP/([32]|1\\.[01])" },
            { className: "number", begin: "\\b\\d{3}\\b" },
          ],
          starts: { end: /\b\B/, illegal: /\S/, contains: o },
        },
        {
          begin: "(?=^[A-Z]+ (.*?) HTTP/([32]|1\\.[01])$)",
          end: /$/,
          contains: [
            { className: "string", begin: " ", end: " ", excludeBegin: !0, excludeEnd: !0 },
            { className: "meta", begin: "HTTP/([32]|1\\.[01])" },
            { className: "keyword", begin: "[A-Z]+" },
          ],
          starts: { end: /\b\B/, illegal: /\S/, contains: o },
        },
        e.inherit(s, { relevance: 0 }),
      ],
    };
  }
  Ha.exports = Id;
});

export { $a };
