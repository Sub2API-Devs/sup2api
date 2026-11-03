/**
 * highlight.js/lib/languages/moonscript.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:303563-305312 cjs-fingerprint
var si = x(function (ig, ii) {
  function Ap(e) {
    let t = {
        keyword:
          "if then not for in while do return else elseif break continue switch and or unless when class extends super local import export from using",
        literal: "true false nil",
        built_in:
          "_G _VERSION assert collectgarbage dofile error getfenv getmetatable ipairs load loadfile loadstring module next pairs pcall print rawequal rawget rawset require select setfenv setmetatable tonumber tostring type unpack xpcall coroutine debug io math os package string table",
      },
      n = "[A-Za-z$_][0-9A-Za-z$_]*",
      a = { className: "subst", begin: /#\{/, end: /\}/, keywords: t },
      s = [
        e.inherit(e.C_NUMBER_MODE, { starts: { end: "(\\s*/)?", relevance: 0 } }),
        {
          className: "string",
          variants: [
            { begin: /'/, end: /'/, contains: [e.BACKSLASH_ESCAPE] },
            { begin: /"/, end: /"/, contains: [e.BACKSLASH_ESCAPE, a] },
          ],
        },
        { className: "built_in", begin: "@__" + e.IDENT_RE },
        { begin: "@" + e.IDENT_RE },
        { begin: e.IDENT_RE + "\\\\" + e.IDENT_RE },
      ];
    a.contains = s;
    let inherit = e.inherit(e.TITLE_MODE, { begin: "[A-Za-z$_][0-9A-Za-z$_]*" }),
      r = "(\\(.*\\)\\s*)?\\B[-=]>",
      i = {
        className: "params",
        begin: "\\([^\\(]",
        returnBegin: !0,
        contains: [{ begin: /\(/, end: /\)/, keywords: t, contains: ["self"].concat(s) }],
      };
    return {
      name: "MoonScript",
      aliases: ["moon"],
      keywords: t,
      illegal: /\/\*/,
      contains: s.concat([
        e.COMMENT("--", "$"),
        {
          className: "function",
          begin: "^\\s*[A-Za-z$_][0-9A-Za-z$_]*\\s*=\\s*" + r,
          end: "[-=]>",
          returnBegin: !0,
          contains: [inherit, i],
        },
        {
          begin: /[\(,:=]\s*/,
          relevance: 0,
          contains: [{ className: "function", begin: r, end: "[-=]>", returnBegin: !0, contains: [i] }],
        },
        {
          className: "class",
          beginKeywords: "class",
          end: "$",
          illegal: /[:="\[\]]/,
          contains: [
            { beginKeywords: "extends", endsWithParent: !0, illegal: /[:="\[\]]/, contains: [inherit] },
            inherit,
          ],
        },
        {
          className: "name",
          begin: "[A-Za-z$_][0-9A-Za-z$_]*:",
          end: ":",
          returnBegin: !0,
          returnEnd: !0,
          relevance: 0,
        },
      ]),
    };
  }
  ii.exports = Ap;
});

export { si };
