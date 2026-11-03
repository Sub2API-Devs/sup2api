/**
 * highlight.js/lib/languages/zephir.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:563704-565279 cjs-fingerprint
var Ec = x(function (hb, uc) {
  function g_(e) {
    let t = {
        className: "string",
        contains: [e.BACKSLASH_ESCAPE],
        variants: [
          e.inherit(e.APOS_STRING_MODE, { illegal: null }),
          e.inherit(e.QUOTE_STRING_MODE, { illegal: null }),
        ],
      },
      UNDERSCORE_TITLE_MODE = e.UNDERSCORE_TITLE_MODE,
      a = { variants: [e.BINARY_NUMBER_MODE, e.C_NUMBER_MODE] },
      s =
        "namespace class interface use extends function return abstract final public protected private static deprecated throw try catch Exception echo empty isset instanceof unset let var new const self require if else elseif switch case default do while loop for continue break likely unlikely __LINE__ __FILE__ __DIR__ __FUNCTION__ __CLASS__ __TRAIT__ __METHOD__ __NAMESPACE__ array boolean float double integer object resource string char long unsigned bool int uint ulong uchar true false null undefined";
    return {
      name: "Zephir",
      aliases: ["zep"],
      keywords: s,
      contains: [
        e.C_LINE_COMMENT_MODE,
        e.COMMENT(/\/\*/, /\*\//, { contains: [{ className: "doctag", begin: /@[A-Za-z]+/ }] }),
        { className: "string", begin: /<<<['"]?\w+['"]?$/, end: /^\w+;/, contains: [e.BACKSLASH_ESCAPE] },
        { begin: /(::|->)+[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*/ },
        {
          className: "function",
          beginKeywords: "function fn",
          end: /[;{]/,
          excludeEnd: !0,
          illegal: /\$|\[|%/,
          contains: [
            UNDERSCORE_TITLE_MODE,
            {
              className: "params",
              begin: /\(/,
              end: /\)/,
              keywords: s,
              contains: ["self", e.C_BLOCK_COMMENT_MODE, t, a],
            },
          ],
        },
        {
          className: "class",
          beginKeywords: "class interface",
          end: /\{/,
          excludeEnd: !0,
          illegal: /[:($"]/,
          contains: [{ beginKeywords: "extends implements" }, UNDERSCORE_TITLE_MODE],
        },
        { beginKeywords: "namespace", end: /;/, illegal: /[.']/, contains: [UNDERSCORE_TITLE_MODE] },
        { beginKeywords: "use", end: /;/, contains: [UNDERSCORE_TITLE_MODE] },
        { begin: /=>/ },
        t,
        a,
      ],
    };
  }
  uc.exports = g_;
});

export { Ec };
