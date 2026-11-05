/**
 * parse5/dist/common/foreign-content.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: parse5@7.2.0..7.2.1
 * pieces: chunk-p9ac6cnb.js (9)
 * attribution: esm-fingerprint 9
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { NAMESPACES, ATTRS } from "../../lib/common/html.js";
import { TAG_ID, getTagID } from "./html.js";

//@ chunk-p9ac6cnb.js:129218-131766 esm-fingerprint
var MIME_TYPES = {
  TEXT_HTML: "text/html",
  APPLICATION_XML: "application/xhtml+xml",
};
var DEFINITION_URL_ATTR = "definitionurl";
var ADJUSTED_DEFINITION_URL_ATTR = "definitionURL";
var SVG_ATTRS_ADJUSTMENT_MAP = new Map(
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
  ].map((attr) => [attr.toLowerCase(), attr]),
);
var XML_ATTRS_ADJUSTMENT_MAP = new Map([
  [
    "xlink:actuate",
    {
      prefix: "xlink",
      name: "actuate",
      namespace: NAMESPACES.XLINK,
    },
  ],
  [
    "xlink:arcrole",
    {
      prefix: "xlink",
      name: "arcrole",
      namespace: NAMESPACES.XLINK,
    },
  ],
  [
    "xlink:href",
    {
      prefix: "xlink",
      name: "href",
      namespace: NAMESPACES.XLINK,
    },
  ],
  [
    "xlink:role",
    {
      prefix: "xlink",
      name: "role",
      namespace: NAMESPACES.XLINK,
    },
  ],
  [
    "xlink:show",
    {
      prefix: "xlink",
      name: "show",
      namespace: NAMESPACES.XLINK,
    },
  ],
  [
    "xlink:title",
    {
      prefix: "xlink",
      name: "title",
      namespace: NAMESPACES.XLINK,
    },
  ],
  [
    "xlink:type",
    {
      prefix: "xlink",
      name: "type",
      namespace: NAMESPACES.XLINK,
    },
  ],
  [
    "xml:lang",
    {
      prefix: "xml",
      name: "lang",
      namespace: NAMESPACES.XML,
    },
  ],
  [
    "xml:space",
    {
      prefix: "xml",
      name: "space",
      namespace: NAMESPACES.XML,
    },
  ],
  [
    "xmlns",
    {
      prefix: "",
      name: "xmlns",
      namespace: NAMESPACES.XMLNS,
    },
  ],
  [
    "xmlns:xlink",
    {
      prefix: "xmlns",
      name: "xlink",
      namespace: NAMESPACES.XMLNS,
    },
  ],
]);
var SVG_TAG_NAMES_ADJUSTMENT_MAP = new Map(
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
  ].map((tn) => [tn.toLowerCase(), tn]),
);
var EXITS_FOREIGN_CONTENT = new Set([
  TAG_ID.B,
  TAG_ID.BIG,
  TAG_ID.BLOCKQUOTE,
  TAG_ID.BODY,
  TAG_ID.BR,
  TAG_ID.CENTER,
  TAG_ID.CODE,
  TAG_ID.DD,
  TAG_ID.DIV,
  TAG_ID.DL,
  TAG_ID.DT,
  TAG_ID.EM,
  TAG_ID.EMBED,
  TAG_ID.H1,
  TAG_ID.H2,
  TAG_ID.H3,
  TAG_ID.H4,
  TAG_ID.H5,
  TAG_ID.H6,
  TAG_ID.HEAD,
  TAG_ID.HR,
  TAG_ID.I,
  TAG_ID.IMG,
  TAG_ID.LI,
  TAG_ID.LISTING,
  TAG_ID.MENU,
  TAG_ID.META,
  TAG_ID.NOBR,
  TAG_ID.OL,
  TAG_ID.P,
  TAG_ID.PRE,
  TAG_ID.RUBY,
  TAG_ID.S,
  TAG_ID.SMALL,
  TAG_ID.SPAN,
  TAG_ID.STRONG,
  TAG_ID.STRIKE,
  TAG_ID.SUB,
  TAG_ID.SUP,
  TAG_ID.TABLE,
  TAG_ID.TT,
  TAG_ID.U,
  TAG_ID.UL,
  TAG_ID.VAR,
]);
//@ chunk-p9ac6cnb.js:131766-131887 esm-fingerprint
function causesExit(startTagToken) {
  let tn = startTagToken.tagID;
  return (
    (tn === TAG_ID.FONT &&
      startTagToken.attrs.some(
        ({ name }) => name === ATTRS.COLOR || name === ATTRS.SIZE || name === ATTRS.FACE,
      )) ||
    EXITS_FOREIGN_CONTENT.has(tn)
  );
}
//@ chunk-p9ac6cnb.js:131887-131986 esm-fingerprint
function adjustTokenMathMLAttrs(token) {
  for (let i = 0; i < token.attrs.length; i++)
    if (token.attrs[i].name === DEFINITION_URL_ATTR) {
      token.attrs[i].name = ADJUSTED_DEFINITION_URL_ATTR;
      break;
    }
}
//@ chunk-p9ac6cnb.js:131986-132095 esm-fingerprint
function adjustTokenSVGAttrs(token) {
  for (let i = 0; i < token.attrs.length; i++) {
    let adjustedAttrName = SVG_ATTRS_ADJUSTMENT_MAP.get(token.attrs[i].name);
    if (adjustedAttrName != null) token.attrs[i].name = adjustedAttrName;
  }
}
//@ chunk-p9ac6cnb.js:132095-132263 esm-fingerprint
function adjustTokenXMLAttrs(token) {
  for (let i = 0; i < token.attrs.length; i++) {
    let adjustedAttrEntry = XML_ATTRS_ADJUSTMENT_MAP.get(token.attrs[i].name);
    if (adjustedAttrEntry) {
      token.attrs[i].prefix = adjustedAttrEntry.prefix;
      token.attrs[i].name = adjustedAttrEntry.name;
      token.attrs[i].namespace = adjustedAttrEntry.namespace;
    }
  }
}
//@ chunk-p9ac6cnb.js:132263-132346 esm-fingerprint
function adjustTokenSVGTagName(token) {
  let adjustedTagName = SVG_TAG_NAMES_ADJUSTMENT_MAP.get(token.tagName);
  if (adjustedTagName != null) {
    token.tagName = adjustedTagName;
    token.tagID = getTagID(token.tagName);
  }
}
//@ chunk-p9ac6cnb.js:132346-132438 esm-fingerprint
function isMathMLTextIntegrationPoint(tn, ns) {
  return (
    ns === NAMESPACES.MATHML &&
    (tn === TAG_ID.MI || tn === TAG_ID.MO || tn === TAG_ID.MN || tn === TAG_ID.MS || tn === TAG_ID.MTEXT)
  );
}
//@ chunk-p9ac6cnb.js:132438-132696 esm-fingerprint
function isHtmlIntegrationPoint(tn, ns, attrs) {
  if (ns === NAMESPACES.MATHML && tn === TAG_ID.ANNOTATION_XML) {
    for (let i = 0; i < attrs.length; i++)
      if (attrs[i].name === ATTRS.ENCODING) {
        let value = attrs[i].value.toLowerCase();
        return value === MIME_TYPES.TEXT_HTML || value === MIME_TYPES.APPLICATION_XML;
      }
  }
  return ns === NAMESPACES.SVG && (tn === TAG_ID.FOREIGN_OBJECT || tn === TAG_ID.DESC || tn === TAG_ID.TITLE);
}
//@ chunk-p9ac6cnb.js:132696-132780 esm-fingerprint
function isIntegrationPoint(tn, ns, attrs, foreignNS) {
  return (
    ((!foreignNS || foreignNS === NAMESPACES.HTML) && isHtmlIntegrationPoint(tn, ns, attrs)) ||
    ((!foreignNS || foreignNS === NAMESPACES.MATHML) && isMathMLTextIntegrationPoint(tn, ns))
  );
}
export {
  isIntegrationPoint,
  adjustTokenMathMLAttrs,
  adjustTokenXMLAttrs,
  adjustTokenSVGAttrs,
  causesExit,
  adjustTokenSVGTagName,
};
