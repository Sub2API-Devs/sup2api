/**
 * highlight.js/lib/languages/smali.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:435762-436855 cjs-fingerprint
var Vs = x(function (Jg, Ks) {
  function Rm(e) {
    let t = [
        "add",
        "and",
        "cmp",
        "cmpg",
        "cmpl",
        "const",
        "div",
        "double",
        "float",
        "goto",
        "if",
        "int",
        "long",
        "move",
        "mul",
        "neg",
        "new",
        "nop",
        "not",
        "or",
        "rem",
        "return",
        "shl",
        "shr",
        "sput",
        "sub",
        "throw",
        "ushr",
        "xor",
      ],
      n = [
        "aget",
        "aput",
        "array",
        "check",
        "execute",
        "fill",
        "filled",
        "goto/16",
        "goto/32",
        "iget",
        "instance",
        "invoke",
        "iput",
        "monitor",
        "packed",
        "sget",
        "sparse",
      ],
      a = [
        "transient",
        "constructor",
        "abstract",
        "final",
        "synthetic",
        "public",
        "private",
        "protected",
        "static",
        "bridge",
        "system",
      ];
    return {
      name: "Smali",
      contains: [
        { className: "string", begin: '"', end: '"', relevance: 0 },
        e.COMMENT("#", "$", { relevance: 0 }),
        {
          className: "keyword",
          variants: [
            { begin: "\\s*\\.end\\s[a-zA-Z0-9]*" },
            { begin: "^[ ]*\\.[a-zA-Z]*", relevance: 0 },
            { begin: "\\s:[a-zA-Z_0-9]*", relevance: 0 },
            { begin: "\\s(" + a.join("|") + ")" },
          ],
        },
        {
          className: "built_in",
          variants: [
            { begin: "\\s(" + t.join("|") + ")\\s" },
            { begin: "\\s(" + t.join("|") + ")((-|/)[a-zA-Z0-9]+)+\\s", relevance: 10 },
            { begin: "\\s(" + n.join("|") + ")((-|/)[a-zA-Z0-9]+)*\\s", relevance: 10 },
          ],
        },
        {
          className: "class",
          begin: `L[^(;:
]*;`,
          relevance: 0,
        },
        { begin: "[vp][0-9]+" },
      ],
    };
  }
  Ks.exports = Rm;
});

export { Vs };
