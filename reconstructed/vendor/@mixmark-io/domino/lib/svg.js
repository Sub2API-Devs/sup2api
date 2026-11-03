/**
 * @mixmark-io/domino/lib/svg.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ft } from "./Element.js";
import { jn } from "./defineElement.js";
import { ee } from "./utils.js";
import { oa } from "./CSSStyleDeclaration.js";

//@ chunk-vwj6ccer.js:106314-107818 cjs-fingerprint
var Xn = x(function (F0) {
  var q0 = Ft(),
    Sx = jn(),
    Ax = ee(),
    Cx = oa(),
    Dx = (F0.elements = {}),
    create = Object.create(null);
  F0.createElement = function (e, t, r) {
    var a = create[t] || Wn;
    return new a(e, t, r);
  };
  function zn(e) {
    return Sx(e, Wn, Dx, create);
  }
  var Wn = zn({
    superclass: q0,
    name: "SVGElement",
    ctor: function (t, r, a) {
      q0.call(this, t, r, Ax.NAMESPACE.SVG, a);
    },
    props: {
      style: {
        get: function () {
          if (!this._style) this._style = new Cx(this);
          return this._style;
        },
      },
    },
  });
  zn({
    name: "SVGSVGElement",
    ctor: function (t, r, a) {
      Wn.call(this, t, r, a);
    },
    tag: "svg",
    props: {
      createSVGRect: {
        value: function () {
          return F0.createElement(this.ownerDocument, "rect", null);
        },
      },
    },
  });
  zn({
    tags: [
      "a",
      "altGlyph",
      "altGlyphDef",
      "altGlyphItem",
      "animate",
      "animateColor",
      "animateMotion",
      "animateTransform",
      "circle",
      "clipPath",
      "color-profile",
      "cursor",
      "defs",
      "desc",
      "ellipse",
      "feBlend",
      "feColorMatrix",
      "feComponentTransfer",
      "feComposite",
      "feConvolveMatrix",
      "feDiffuseLighting",
      "feDisplacementMap",
      "feDistantLight",
      "feFlood",
      "feFuncA",
      "feFuncB",
      "feFuncG",
      "feFuncR",
      "feGaussianBlur",
      "feImage",
      "feMerge",
      "feMergeNode",
      "feMorphology",
      "feOffset",
      "fePointLight",
      "feSpecularLighting",
      "feSpotLight",
      "feTile",
      "feTurbulence",
      "filter",
      "font",
      "font-face",
      "font-face-format",
      "font-face-name",
      "font-face-src",
      "font-face-uri",
      "foreignObject",
      "g",
      "glyph",
      "glyphRef",
      "hkern",
      "image",
      "line",
      "linearGradient",
      "marker",
      "mask",
      "metadata",
      "missing-glyph",
      "mpath",
      "path",
      "pattern",
      "polygon",
      "polyline",
      "radialGradient",
      "rect",
      "script",
      "set",
      "stop",
      "style",
      "switch",
      "symbol",
      "text",
      "textPath",
      "title",
      "tref",
      "tspan",
      "use",
      "view",
      "vkern",
    ],
  });
});

export { Xn };
