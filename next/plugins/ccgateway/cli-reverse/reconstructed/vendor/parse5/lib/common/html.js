/**
 * parse5/lib/common/html.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: parse5@7.2.0..7.2.1
 * pieces: chunk-p9ac6cnb.js (9)
 * attribution: esm-layout 5, esm-fingerprint 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getDecoder } from "../../../entities/lib/esm/decode.js";
import { uint16Array, uint16Array_2 } from "../../../entities/lib/esm/generated/decode-data-xml.js";

//@ chunk-p9ac6cnb.js:62667-62690 esm-layout
var htmlDecodeTree = getDecoder(uint16Array);
var htmlDecodeTreeSecond = getDecoder(uint16Array_2);
//@ chunk-p9ac6cnb.js:62690-62696 esm-layout
var NAMESPACES;
//@ chunk-p9ac6cnb.js:62696-62965 esm-fingerprint
(function (NAMESPACES) {
  NAMESPACES.HTML = "http://www.w3.org/1999/xhtml";
  NAMESPACES.MATHML = "http://www.w3.org/1998/Math/MathML";
  NAMESPACES.SVG = "http://www.w3.org/2000/svg";
  NAMESPACES.XLINK = "http://www.w3.org/1999/xlink";
  NAMESPACES.XML = "http://www.w3.org/XML/1998/namespace";
  NAMESPACES.XMLNS = "http://www.w3.org/2000/xmlns/";
})(NAMESPACES || (NAMESPACES = {}));
//@ chunk-p9ac6cnb.js:62965-62971 esm-layout
var ATTRS;
//@ chunk-p9ac6cnb.js:62971-63127 esm-fingerprint
(function (ATTRS) {
  ATTRS.TYPE = "type";
  ATTRS.ACTION = "action";
  ATTRS.ENCODING = "encoding";
  ATTRS.PROMPT = "prompt";
  ATTRS.NAME = "name";
  ATTRS.COLOR = "color";
  ATTRS.FACE = "face";
  ATTRS.SIZE = "size";
})(ATTRS || (ATTRS = {}));
//@ chunk-p9ac6cnb.js:63127-63133 esm-layout
var DOCUMENT_MODE;
//@ chunk-p9ac6cnb.js:63133-63235 esm-fingerprint
(function (DOCUMENT_MODE) {
  DOCUMENT_MODE.NO_QUIRKS = "no-quirks";
  DOCUMENT_MODE.QUIRKS = "quirks";
  DOCUMENT_MODE.LIMITED_QUIRKS = "limited-quirks";
})(DOCUMENT_MODE || (DOCUMENT_MODE = {}));
//@ chunk-p9ac6cnb.js:63235-63241 esm-layout
var TAG_NAMES;
//@ chunk-p9ac6cnb.js:63241-65146 esm-fingerprint
(function (TAG_NAMES) {
  TAG_NAMES.A = "a";
  TAG_NAMES.ADDRESS = "address";
  TAG_NAMES.ANNOTATION_XML = "annotation-xml";
  TAG_NAMES.APPLET = "applet";
  TAG_NAMES.AREA = "area";
  TAG_NAMES.ARTICLE = "article";
  TAG_NAMES.ASIDE = "aside";
  TAG_NAMES.B = "b";
  TAG_NAMES.BASE = "base";
  TAG_NAMES.BASEFONT = "basefont";
  TAG_NAMES.BGSOUND = "bgsound";
  TAG_NAMES.BIG = "big";
  TAG_NAMES.BLOCKQUOTE = "blockquote";
  TAG_NAMES.BODY = "body";
  TAG_NAMES.BR = "br";
  TAG_NAMES.BUTTON = "button";
  TAG_NAMES.CAPTION = "caption";
  TAG_NAMES.CENTER = "center";
  TAG_NAMES.CODE = "code";
  TAG_NAMES.COL = "col";
  TAG_NAMES.COLGROUP = "colgroup";
  TAG_NAMES.DD = "dd";
  TAG_NAMES.DESC = "desc";
  TAG_NAMES.DETAILS = "details";
  TAG_NAMES.DIALOG = "dialog";
  TAG_NAMES.DIR = "dir";
  TAG_NAMES.DIV = "div";
  TAG_NAMES.DL = "dl";
  TAG_NAMES.DT = "dt";
  TAG_NAMES.EM = "em";
  TAG_NAMES.EMBED = "embed";
  TAG_NAMES.FIELDSET = "fieldset";
  TAG_NAMES.FIGCAPTION = "figcaption";
  TAG_NAMES.FIGURE = "figure";
  TAG_NAMES.FONT = "font";
  TAG_NAMES.FOOTER = "footer";
  TAG_NAMES.FOREIGN_OBJECT = "foreignObject";
  TAG_NAMES.FORM = "form";
  TAG_NAMES.FRAME = "frame";
  TAG_NAMES.FRAMESET = "frameset";
  TAG_NAMES.H1 = "h1";
  TAG_NAMES.H2 = "h2";
  TAG_NAMES.H3 = "h3";
  TAG_NAMES.H4 = "h4";
  TAG_NAMES.H5 = "h5";
  TAG_NAMES.H6 = "h6";
  TAG_NAMES.HEAD = "head";
  TAG_NAMES.HEADER = "header";
  TAG_NAMES.HGROUP = "hgroup";
  TAG_NAMES.HR = "hr";
  TAG_NAMES.HTML = "html";
  TAG_NAMES.I = "i";
  TAG_NAMES.IMG = "img";
  TAG_NAMES.IMAGE = "image";
  TAG_NAMES.INPUT = "input";
  TAG_NAMES.IFRAME = "iframe";
  TAG_NAMES.KEYGEN = "keygen";
  TAG_NAMES.LABEL = "label";
  TAG_NAMES.LI = "li";
  TAG_NAMES.LINK = "link";
  TAG_NAMES.LISTING = "listing";
  TAG_NAMES.MAIN = "main";
  TAG_NAMES.MALIGNMARK = "malignmark";
  TAG_NAMES.MARQUEE = "marquee";
  TAG_NAMES.MATH = "math";
  TAG_NAMES.MENU = "menu";
  TAG_NAMES.META = "meta";
  TAG_NAMES.MGLYPH = "mglyph";
  TAG_NAMES.MI = "mi";
  TAG_NAMES.MO = "mo";
  TAG_NAMES.MN = "mn";
  TAG_NAMES.MS = "ms";
  TAG_NAMES.MTEXT = "mtext";
  TAG_NAMES.NAV = "nav";
  TAG_NAMES.NOBR = "nobr";
  TAG_NAMES.NOFRAMES = "noframes";
  TAG_NAMES.NOEMBED = "noembed";
  TAG_NAMES.NOSCRIPT = "noscript";
  TAG_NAMES.OBJECT = "object";
  TAG_NAMES.OL = "ol";
  TAG_NAMES.OPTGROUP = "optgroup";
  TAG_NAMES.OPTION = "option";
  TAG_NAMES.P = "p";
  TAG_NAMES.PARAM = "param";
  TAG_NAMES.PLAINTEXT = "plaintext";
  TAG_NAMES.PRE = "pre";
  TAG_NAMES.RB = "rb";
  TAG_NAMES.RP = "rp";
  TAG_NAMES.RT = "rt";
  TAG_NAMES.RTC = "rtc";
  TAG_NAMES.RUBY = "ruby";
  TAG_NAMES.S = "s";
  TAG_NAMES.SCRIPT = "script";
  TAG_NAMES.SEARCH = "search";
  TAG_NAMES.SECTION = "section";
  TAG_NAMES.SELECT = "select";
  TAG_NAMES.SOURCE = "source";
  TAG_NAMES.SMALL = "small";
  TAG_NAMES.SPAN = "span";
  TAG_NAMES.STRIKE = "strike";
  TAG_NAMES.STRONG = "strong";
  TAG_NAMES.STYLE = "style";
  TAG_NAMES.SUB = "sub";
  TAG_NAMES.SUMMARY = "summary";
  TAG_NAMES.SUP = "sup";
  TAG_NAMES.TABLE = "table";
  TAG_NAMES.TBODY = "tbody";
  TAG_NAMES.TEMPLATE = "template";
  TAG_NAMES.TEXTAREA = "textarea";
  TAG_NAMES.TFOOT = "tfoot";
  TAG_NAMES.TD = "td";
  TAG_NAMES.TH = "th";
  TAG_NAMES.THEAD = "thead";
  TAG_NAMES.TITLE = "title";
  TAG_NAMES.TR = "tr";
  TAG_NAMES.TRACK = "track";
  TAG_NAMES.TT = "tt";
  TAG_NAMES.U = "u";
  TAG_NAMES.UL = "ul";
  TAG_NAMES.SVG = "svg";
  TAG_NAMES.VAR = "var";
  TAG_NAMES.WBR = "wbr";
  TAG_NAMES.XMP = "xmp";
})(TAG_NAMES || (TAG_NAMES = {}));
export { TAG_NAMES, NAMESPACES, DOCUMENT_MODE, ATTRS };
