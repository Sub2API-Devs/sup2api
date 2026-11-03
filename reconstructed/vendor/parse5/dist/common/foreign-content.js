/**
 * parse5/dist/common/foreign-content.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: parse5@7.2.0..7.2.1
 * pieces: chunk-6ja29j2n.js (9)
 * attribution: esm-fingerprint 9
 */
import { E, g } from "../../lib/common/html.js";
import { u, x } from "./html.js";

//@ chunk-6ja29j2n.js:129218-131766 esm-fingerprint
var We = { TEXT_HTML: "text/html", APPLICATION_XML: "application/xhtml+xml" },
  DEFINITIONURL = "definitionurl",
  DEFINITIONURL_2 = "definitionURL",
  Gt = new Map(
    [
      "attributeName",
      "attributeType",
      "baseFrequency",
      "baseProfile",
      "calcMode",
      "clipPathUnits",
      "diffuseConstant",
      "edgeMode",
      "filterUnits",
      "glyphRef",
      "gradientTransform",
      "gradientUnits",
      "kernelMatrix",
      "kernelUnitLength",
      "keyPoints",
      "keySplines",
      "keyTimes",
      "lengthAdjust",
      "limitingConeAngle",
      "markerHeight",
      "markerUnits",
      "markerWidth",
      "maskContentUnits",
      "maskUnits",
      "numOctaves",
      "pathLength",
      "patternContentUnits",
      "patternTransform",
      "patternUnits",
      "pointsAtX",
      "pointsAtY",
      "pointsAtZ",
      "preserveAlpha",
      "preserveAspectRatio",
      "primitiveUnits",
      "refX",
      "refY",
      "repeatCount",
      "repeatDur",
      "requiredExtensions",
      "requiredFeatures",
      "specularConstant",
      "specularExponent",
      "spreadMethod",
      "startOffset",
      "stdDeviation",
      "stitchTiles",
      "surfaceScale",
      "systemLanguage",
      "tableValues",
      "targetX",
      "targetY",
      "textLength",
      "viewBox",
      "viewTarget",
      "xChannelSelector",
      "yChannelSelector",
      "zoomAndPan",
    ].map((e) => [e.toLowerCase(), e]),
  ),
  Wt = new Map([
    ["xlink:actuate", { prefix: "xlink", name: "actuate", namespace: E.XLINK }],
    ["xlink:arcrole", { prefix: "xlink", name: "arcrole", namespace: E.XLINK }],
    ["xlink:href", { prefix: "xlink", name: "href", namespace: E.XLINK }],
    ["xlink:role", { prefix: "xlink", name: "role", namespace: E.XLINK }],
    ["xlink:show", { prefix: "xlink", name: "show", namespace: E.XLINK }],
    ["xlink:title", { prefix: "xlink", name: "title", namespace: E.XLINK }],
    ["xlink:type", { prefix: "xlink", name: "type", namespace: E.XLINK }],
    ["xml:lang", { prefix: "xml", name: "lang", namespace: E.XML }],
    ["xml:space", { prefix: "xml", name: "space", namespace: E.XML }],
    ["xmlns", { prefix: "", name: "xmlns", namespace: E.XMLNS }],
    ["xmlns:xlink", { prefix: "xmlns", name: "xlink", namespace: E.XMLNS }],
  ]),
  qt = new Map(
    [
      "altGlyph",
      "altGlyphDef",
      "altGlyphItem",
      "animateColor",
      "animateMotion",
      "animateTransform",
      "clipPath",
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
      "foreignObject",
      "glyphRef",
      "linearGradient",
      "radialGradient",
      "textPath",
    ].map((e) => [e.toLowerCase(), e]),
  ),
  Xt = new Set([
    u.B,
    u.BIG,
    u.BLOCKQUOTE,
    u.BODY,
    u.BR,
    u.CENTER,
    u.CODE,
    u.DD,
    u.DIV,
    u.DL,
    u.DT,
    u.EM,
    u.EMBED,
    u.H1,
    u.H2,
    u.H3,
    u.H4,
    u.H5,
    u.H6,
    u.HEAD,
    u.HR,
    u.I,
    u.IMG,
    u.LI,
    u.LISTING,
    u.MENU,
    u.META,
    u.NOBR,
    u.OL,
    u.P,
    u.PRE,
    u.RUBY,
    u.S,
    u.SMALL,
    u.SPAN,
    u.STRONG,
    u.STRIKE,
    u.SUB,
    u.SUP,
    u.TABLE,
    u.TT,
    u.U,
    u.UL,
    u.VAR,
  ]);
//@ chunk-6ja29j2n.js:131766-131887 esm-fingerprint
function qe(e) {
  let tagID = e.tagID;
  return (
    (tagID === u.FONT && e.attrs.some(({ name: n }) => n === g.COLOR || n === g.SIZE || n === g.FACE)) ||
    Xt.has(tagID)
  );
}
//@ chunk-6ja29j2n.js:131887-131986 esm-fingerprint
function fe(e) {
  for (let t = 0; t < e.attrs.length; t++)
    if (e.attrs[t].name === DEFINITIONURL) {
      e.attrs[t].name = DEFINITIONURL_2;
      break;
    }
}
//@ chunk-6ja29j2n.js:131986-132095 esm-fingerprint
function me(e) {
  for (let t = 0; t < e.attrs.length; t++) {
    let a = Gt.get(e.attrs[t].name);
    if (a != null) e.attrs[t].name = a;
  }
}
//@ chunk-6ja29j2n.js:132095-132263 esm-fingerprint
function te(e) {
  for (let t = 0; t < e.attrs.length; t++) {
    let a = Wt.get(e.attrs[t].name);
    if (a) ((e.attrs[t].prefix = a.prefix), (e.attrs[t].name = a.name), (e.attrs[t].namespace = a.namespace));
  }
}
//@ chunk-6ja29j2n.js:132263-132346 esm-fingerprint
function Xe(e) {
  let t = qt.get(e.tagName);
  if (t != null) ((e.tagName = t), (e.tagID = x(e.tagName)));
}
//@ chunk-6ja29j2n.js:132346-132438 esm-fingerprint
function Kt(e, t) {
  return t === E.MATHML && (e === u.MI || e === u.MO || e === u.MN || e === u.MS || e === u.MTEXT);
}
//@ chunk-6ja29j2n.js:132438-132696 esm-fingerprint
function Vt(e, t, a) {
  if (t === E.MATHML && e === u.ANNOTATION_XML) {
    for (let n = 0; n < a.length; n++)
      if (a[n].name === g.ENCODING) {
        let lower = a[n].value.toLowerCase();
        return lower === We.TEXT_HTML || lower === We.APPLICATION_XML;
      }
  }
  return t === E.SVG && (e === u.FOREIGN_OBJECT || e === u.DESC || e === u.TITLE);
}
//@ chunk-6ja29j2n.js:132696-132780 esm-fingerprint
function Ke(e, t, a, n) {
  return ((!n || n === E.HTML) && Vt(e, t, a)) || ((!n || n === E.MATHML) && Kt(e, t));
}

export { Ke, fe, te, me, qe, Xe };
