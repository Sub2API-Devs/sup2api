/**
 * highlight.js/lib/languages/rsl.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:397360-398652 cjs-fingerprint
var require_rsl = __commonJS(function (cjsExports, cjsModule) {
  function rsl(hljs) {
    let BUILT_INS = [
      "abs",
      "acos",
      "ambient",
      "area",
      "asin",
      "atan",
      "atmosphere",
      "attribute",
      "calculatenormal",
      "ceil",
      "cellnoise",
      "clamp",
      "comp",
      "concat",
      "cos",
      "degrees",
      "depth",
      "Deriv",
      "diffuse",
      "distance",
      "Du",
      "Dv",
      "environment",
      "exp",
      "faceforward",
      "filterstep",
      "floor",
      "format",
      "fresnel",
      "incident",
      "length",
      "lightsource",
      "log",
      "match",
      "max",
      "min",
      "mod",
      "noise",
      "normalize",
      "ntransform",
      "opposite",
      "option",
      "phong",
      "pnoise",
      "pow",
      "printf",
      "ptlined",
      "radians",
      "random",
      "reflect",
      "refract",
      "renderinfo",
      "round",
      "setcomp",
      "setxcomp",
      "setycomp",
      "setzcomp",
      "shadow",
      "sign",
      "sin",
      "smoothstep",
      "specular",
      "specularbrdf",
      "spline",
      "sqrt",
      "step",
      "tan",
      "texture",
      "textureinfo",
      "trace",
      "transform",
      "vtransform",
      "xcomp",
      "ycomp",
      "zcomp",
    ];
    let TYPES = ["matrix", "float", "color", "point", "normal", "vector"];
    let KEYWORDS = ["while", "for", "if", "do", "return", "else", "break", "extern", "continue"];
    let CLASS_DEFINITION = {
      match: [/(surface|displacement|light|volume|imager)/, /\s+/, hljs.IDENT_RE],
      scope: {
        1: "keyword",
        3: "title.class",
      },
    };
    return {
      name: "RenderMan RSL",
      keywords: {
        keyword: KEYWORDS,
        built_in: BUILT_INS,
        type: TYPES,
      },
      illegal: "</",
      contains: [
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        hljs.QUOTE_STRING_MODE,
        hljs.APOS_STRING_MODE,
        hljs.C_NUMBER_MODE,
        {
          className: "meta",
          begin: "#",
          end: "$",
        },
        CLASS_DEFINITION,
        {
          beginKeywords: "illuminate illuminance gather",
          end: "\\(",
        },
      ],
    };
  }
  cjsModule.exports = rsl;
});
export { require_rsl };
