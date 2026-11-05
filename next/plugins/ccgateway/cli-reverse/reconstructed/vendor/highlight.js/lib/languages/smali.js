/**
 * highlight.js/lib/languages/smali.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:435762-436855 cjs-fingerprint
var require_smali = __commonJS(function (cjsExports, cjsModule) {
  function smali(hljs) {
    let smali_instr_low_prio = [
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
    ];
    let smali_instr_high_prio = [
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
    ];
    let smali_keywords = [
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
        {
          className: "string",
          begin: '"',
          end: '"',
          relevance: 0,
        },
        hljs.COMMENT("#", "$", {
          relevance: 0,
        }),
        {
          className: "keyword",
          variants: [
            {
              begin: "\\s*\\.end\\s[a-zA-Z0-9]*",
            },
            {
              begin: "^[ ]*\\.[a-zA-Z]*",
              relevance: 0,
            },
            {
              begin: "\\s:[a-zA-Z_0-9]*",
              relevance: 0,
            },
            {
              begin: "\\s(" + smali_keywords.join("|") + ")",
            },
          ],
        },
        {
          className: "built_in",
          variants: [
            {
              begin: "\\s(" + smali_instr_low_prio.join("|") + ")\\s",
            },
            {
              begin: "\\s(" + smali_instr_low_prio.join("|") + ")((-|/)[a-zA-Z0-9]+)+\\s",
              relevance: 10,
            },
            {
              begin: "\\s(" + smali_instr_high_prio.join("|") + ")((-|/)[a-zA-Z0-9]+)*\\s",
              relevance: 10,
            },
          ],
        },
        {
          className: "class",
          begin: `L[^(;:
]*;`,
          relevance: 0,
        },
        {
          begin: "[vp][0-9]+",
        },
      ],
    };
  }
  cjsModule.exports = smali;
});
export { require_smali };
