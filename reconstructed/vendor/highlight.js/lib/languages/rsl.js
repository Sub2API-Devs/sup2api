/**
 * highlight.js/lib/languages/rsl.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:397360-398652 cjs-fingerprint
var Is = x(function (Hg, vs) {
  function im(e) {
    let t = [
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
      ],
      n = ["matrix", "float", "color", "point", "normal", "vector"],
      a = ["while", "for", "if", "do", "return", "else", "break", "extern", "continue"],
      s = {
        match: [/(surface|displacement|light|volume|imager)/, /\s+/, e.IDENT_RE],
        scope: { 1: "keyword", 3: "title.class" },
      };
    return {
      name: "RenderMan RSL",
      keywords: { keyword: a, built_in: t, type: n },
      illegal: "</",
      contains: [
        e.C_LINE_COMMENT_MODE,
        e.C_BLOCK_COMMENT_MODE,
        e.QUOTE_STRING_MODE,
        e.APOS_STRING_MODE,
        e.C_NUMBER_MODE,
        { className: "meta", begin: "#", end: "$" },
        s,
        { beginKeywords: "illuminate illuminance gather", end: "\\(" },
      ],
    };
  }
  vs.exports = im;
});

export { Is };
