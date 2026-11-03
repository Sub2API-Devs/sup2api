/**
 * @mixmark-io/domino/lib/svg.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { require_Element } from "./Element.js";
import { require_defineElement } from "./defineElement.js";
import { require_utils } from "./utils.js";
import { require_CSSStyleDeclaration } from "./CSSStyleDeclaration.js";

//@ chunk-vwj6ccer.js:106314-107818 cjs-fingerprint
var require_svg = x(function (cjsExports) {
  var Element = require_Element();
  var defineElement = require_defineElement();
  var utils = require_utils();
  var CSSStyleDeclaration = require_CSSStyleDeclaration();
  var svgElements = (cjsExports.elements = {});
  var svgNameToImpl = Object.create(null);
  cjsExports.createElement = function (doc, localName, prefix) {
    var impl = svgNameToImpl[localName] || SVGElement;
    return new impl(doc, localName, prefix);
  };
  function define(spec) {
    return defineElement(spec, SVGElement, svgElements, svgNameToImpl);
  }
  var SVGElement = define({
    superclass: Element,
    name: "SVGElement",
    ctor: function (doc, localName, prefix) {
      Element.call(this, doc, localName, utils.NAMESPACE.SVG, prefix);
    },
    props: {
      style: {
        get: function () {
          if (!this._style) this._style = new CSSStyleDeclaration(this);
          return this._style;
        },
      },
    },
  });
  define({
    name: "SVGSVGElement",
    ctor: function (doc, localName, prefix) {
      SVGElement.call(this, doc, localName, prefix);
    },
    tag: "svg",
    props: {
      createSVGRect: {
        value: function () {
          return cjsExports.createElement(this.ownerDocument, "rect", null);
        },
      },
    },
  });
  define({
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
export { require_svg };
