/**
 * highlight.js/lib/languages/scilab.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:419934-421127 cjs-fingerprint
var Fs = x(function (Xg, Gs) {
  function mm(e) {
    let t = [
      e.C_NUMBER_MODE,
      { className: "string", begin: `'|"`, end: `'|"`, contains: [e.BACKSLASH_ESCAPE, { begin: "''" }] },
    ];
    return {
      name: "Scilab",
      aliases: ["sci"],
      keywords: {
        $pattern: /%?\w+/,
        keyword:
          "abort break case clear catch continue do elseif else endfunction end for function global if pause return resume select try then while",
        literal: "%f %F %t %T %pi %eps %inf %nan %e %i %z %s",
        built_in:
          "abs and acos asin atan ceil cd chdir clearglobal cosh cos cumprod deff disp error exec execstr exists exp eye gettext floor fprintf fread fsolve imag isdef isempty isinfisnan isvector lasterror length load linspace list listfiles log10 log2 log max min msprintf mclose mopen ones or pathconvert poly printf prod pwd rand real round sinh sin size gsort sprintf sqrt strcat strcmps tring sum system tanh tan type typename warning zeros matrix",
      },
      illegal: '("|#|/\\*|\\s+/\\w+)',
      contains: [
        {
          className: "function",
          beginKeywords: "function",
          end: "$",
          contains: [e.UNDERSCORE_TITLE_MODE, { className: "params", begin: "\\(", end: "\\)" }],
        },
        { begin: "[a-zA-Z_][a-zA-Z_0-9]*[\\.']+", relevance: 0 },
        { begin: "\\[", end: "\\][\\.']*", relevance: 0, contains: t },
        e.COMMENT("//", "$"),
      ].concat(t),
    };
  }
  Gs.exports = mm;
});

export { Fs };
