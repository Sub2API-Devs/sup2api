/**
 * highlight.js/lib/languages/openscad.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:326893-328178 cjs-fingerprint
var require_openscad = __commonJS(function (cjsExports, cjsModule) {
  function openscad(hljs) {
    let SPECIAL_VARS = {
      className: "keyword",
      begin: "\\$(f[asn]|t|vp[rtd]|children)",
    };
    let LITERALS = {
      className: "literal",
      begin: "false|true|PI|undef",
    };
    let NUMBERS = {
      className: "number",
      begin: "\\b\\d+(\\.\\d+)?(e-?\\d+)?",
      relevance: 0,
    };
    let STRING = hljs.inherit(hljs.QUOTE_STRING_MODE, {
      illegal: null,
    });
    let PREPRO = {
      className: "meta",
      keywords: {
        keyword: "include use",
      },
      begin: "include|use <",
      end: ">",
    };
    let PARAMS = {
      className: "params",
      begin: "\\(",
      end: "\\)",
      contains: ["self", NUMBERS, STRING, SPECIAL_VARS, LITERALS],
    };
    let MODIFIERS = {
      begin: "[*!#%]",
      relevance: 0,
    };
    let FUNCTIONS = {
      className: "function",
      beginKeywords: "module function",
      end: /=|\{/,
      contains: [PARAMS, hljs.UNDERSCORE_TITLE_MODE],
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
      contains: [
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        NUMBERS,
        PREPRO,
        STRING,
        SPECIAL_VARS,
        MODIFIERS,
        FUNCTIONS,
      ],
    };
  }
  cjsModule.exports = openscad;
});
export { require_openscad };
