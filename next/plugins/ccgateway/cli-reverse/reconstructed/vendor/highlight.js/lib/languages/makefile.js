/**
 * highlight.js/lib/languages/makefile.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:274621-275687 cjs-fingerprint
var require_makefile = __commonJS(function (cjsExports, cjsModule) {
  function makefile(hljs) {
    let VARIABLE = {
      className: "variable",
      variants: [
        {
          begin: "\\$\\(" + hljs.UNDERSCORE_IDENT_RE + "\\)",
          contains: [hljs.BACKSLASH_ESCAPE],
        },
        {
          begin: /\$[@%<?\^\+\*]/,
        },
      ],
    };
    let QUOTE_STRING = {
      className: "string",
      begin: /"/,
      end: /"/,
      contains: [hljs.BACKSLASH_ESCAPE, VARIABLE],
    };
    let FUNC = {
      className: "variable",
      begin: /\$\([\w-]+\s/,
      end: /\)/,
      keywords: {
        built_in:
          "subst patsubst strip findstring filter filter-out sort word wordlist firstword lastword dir notdir suffix basename addsuffix addprefix join wildcard realpath abspath error warning shell origin flavor foreach if or and call eval file value",
      },
      contains: [VARIABLE, QUOTE_STRING],
    };
    let ASSIGNMENT = {
      begin: "^" + hljs.UNDERSCORE_IDENT_RE + "\\s*(?=[:+?]?=)",
    };
    let META = {
      className: "meta",
      begin: /^\.PHONY:/,
      end: /$/,
      keywords: {
        $pattern: /[\.\w]+/,
        keyword: ".PHONY",
      },
    };
    let TARGET = {
      className: "section",
      begin: /^[^\s]+:/,
      end: /$/,
      contains: [VARIABLE],
    };
    return {
      name: "Makefile",
      aliases: ["mk", "mak", "make"],
      keywords: {
        $pattern: /[\w-]+/,
        keyword:
          "define endef undefine ifdef ifndef ifeq ifneq else endif include -include sinclude override export unexport private vpath",
      },
      contains: [hljs.HASH_COMMENT_MODE, VARIABLE, QUOTE_STRING, FUNC, ASSIGNMENT, META, TARGET],
    };
  }
  cjsModule.exports = makefile;
});
export { require_makefile };
