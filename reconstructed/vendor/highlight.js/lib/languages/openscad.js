/**
 * highlight.js/lib/languages/openscad.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:326893-328178 cjs-fingerprint
var Ii = x(function (Eg, vi) {
  function Lp(e) {
    let t = { className: "keyword", begin: "\\$(f[asn]|t|vp[rtd]|children)" },
      n = { className: "literal", begin: "false|true|PI|undef" },
      a = { className: "number", begin: "\\b\\d+(\\.\\d+)?(e-?\\d+)?", relevance: 0 },
      inherit = e.inherit(e.QUOTE_STRING_MODE, { illegal: null }),
      o = { className: "meta", keywords: { keyword: "include use" }, begin: "include|use <", end: ">" },
      r = { className: "params", begin: "\\(", end: "\\)", contains: ["self", a, inherit, t, n] },
      i = { begin: "[*!#%]", relevance: 0 },
      c = {
        className: "function",
        beginKeywords: "module function",
        end: /=|\{/,
        contains: [r, e.UNDERSCORE_TITLE_MODE],
      };
    return {
      name: "OpenSCAD",
      aliases: ["scad"],
      keywords: {
        keyword: "function module include use for intersection_for if else \\%",
        literal: "false true PI undef",
        built_in:
          "circle square polygon text sphere cube cylinder polyhedron translate rotate scale resize mirror multmatrix color offset hull minkowski union difference intersection abs sign sin cos tan acos asin atan atan2 floor round ceil ln log pow sqrt exp rands min max concat lookup str chr search version version_num norm cross parent_module echo import import_dxf dxf_linear_extrude linear_extrude rotate_extrude surface projection render children dxf_cross dxf_dim let assign",
      },
      contains: [e.C_LINE_COMMENT_MODE, e.C_BLOCK_COMMENT_MODE, a, o, inherit, t, i, c],
    };
  }
  vi.exports = Lp;
});

export { Ii };
