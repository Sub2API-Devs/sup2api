/**
 * highlight.js/lib/languages/makefile.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:274621-275687 cjs-fingerprint
var Hr = x(function (ZE, qr) {
  function _p(e) {
    let t = {
        className: "variable",
        variants: [
          { begin: "\\$\\(" + e.UNDERSCORE_IDENT_RE + "\\)", contains: [e.BACKSLASH_ESCAPE] },
          { begin: /\$[@%<?\^\+\*]/ },
        ],
      },
      n = { className: "string", begin: /"/, end: /"/, contains: [e.BACKSLASH_ESCAPE, t] },
      a = {
        className: "variable",
        begin: /\$\([\w-]+\s/,
        end: /\)/,
        keywords: {
          built_in:
            "subst patsubst strip findstring filter filter-out sort word wordlist firstword lastword dir notdir suffix basename addsuffix addprefix join wildcard realpath abspath error warning shell origin flavor foreach if or and call eval file value",
        },
        contains: [t, n],
      },
      s = { begin: "^" + e.UNDERSCORE_IDENT_RE + "\\s*(?=[:+?]?=)" },
      o = {
        className: "meta",
        begin: /^\.PHONY:/,
        end: /$/,
        keywords: { $pattern: /[\.\w]+/, keyword: ".PHONY" },
      },
      r = { className: "section", begin: /^[^\s]+:/, end: /$/, contains: [t] };
    return {
      name: "Makefile",
      aliases: ["mk", "mak", "make"],
      keywords: {
        $pattern: /[\w-]+/,
        keyword:
          "define endef undefine ifdef ifndef ifeq ifneq else endif include -include sinclude override export unexport private vpath",
      },
      contains: [e.HASH_COMMENT_MODE, t, n, a, s, o, r],
    };
  }
  qr.exports = _p;
});

export { Hr };
