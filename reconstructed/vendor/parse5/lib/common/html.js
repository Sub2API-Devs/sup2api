/**
 * parse5/lib/common/html.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: parse5@7.2.0..7.2.1
 * pieces: chunk-6ja29j2n.js (9)
 * attribution: esm-layout 5, esm-fingerprint 4
 */
import { De } from "../../../entities/lib/esm/decode.js";
import { uint16Array, uint16Array_2 } from "../../../entities/lib/esm/generated/decode-data-xml.js";

//@ chunk-6ja29j2n.js:62667-62690 esm-layout
var Qa = De(uint16Array),
  Ga = De(uint16Array_2);
//@ chunk-6ja29j2n.js:62690-62696 esm-layout
var E;
//@ chunk-6ja29j2n.js:62696-62965 esm-fingerprint
(function (e) {
  ((e.HTML = "http://www.w3.org/1999/xhtml"),
    (e.MATHML = "http://www.w3.org/1998/Math/MathML"),
    (e.SVG = "http://www.w3.org/2000/svg"),
    (e.XLINK = "http://www.w3.org/1999/xlink"),
    (e.XML = "http://www.w3.org/XML/1998/namespace"),
    (e.XMLNS = "http://www.w3.org/2000/xmlns/"));
})(E || (E = {}));
//@ chunk-6ja29j2n.js:62965-62971 esm-layout
var g;
//@ chunk-6ja29j2n.js:62971-63127 esm-fingerprint
(function (e) {
  ((e.TYPE = "type"),
    (e.ACTION = "action"),
    (e.ENCODING = "encoding"),
    (e.PROMPT = "prompt"),
    (e.NAME = "name"),
    (e.COLOR = "color"),
    (e.FACE = "face"),
    (e.SIZE = "size"));
})(g || (g = {}));
//@ chunk-6ja29j2n.js:63127-63133 esm-layout
var O;
//@ chunk-6ja29j2n.js:63133-63235 esm-fingerprint
(function (e) {
  ((e.NO_QUIRKS = "no-quirks"), (e.QUIRKS = "quirks"), (e.LIMITED_QUIRKS = "limited-quirks"));
})(O || (O = {}));
//@ chunk-6ja29j2n.js:63235-63241 esm-layout
var c;
//@ chunk-6ja29j2n.js:63241-65146 esm-fingerprint
(function (e) {
  ((e.A = "a"),
    (e.ADDRESS = "address"),
    (e.ANNOTATION_XML = "annotation-xml"),
    (e.APPLET = "applet"),
    (e.AREA = "area"),
    (e.ARTICLE = "article"),
    (e.ASIDE = "aside"),
    (e.B = "b"),
    (e.BASE = "base"),
    (e.BASEFONT = "basefont"),
    (e.BGSOUND = "bgsound"),
    (e.BIG = "big"),
    (e.BLOCKQUOTE = "blockquote"),
    (e.BODY = "body"),
    (e.BR = "br"),
    (e.BUTTON = "button"),
    (e.CAPTION = "caption"),
    (e.CENTER = "center"),
    (e.CODE = "code"),
    (e.COL = "col"),
    (e.COLGROUP = "colgroup"),
    (e.DD = "dd"),
    (e.DESC = "desc"),
    (e.DETAILS = "details"),
    (e.DIALOG = "dialog"),
    (e.DIR = "dir"),
    (e.DIV = "div"),
    (e.DL = "dl"),
    (e.DT = "dt"),
    (e.EM = "em"),
    (e.EMBED = "embed"),
    (e.FIELDSET = "fieldset"),
    (e.FIGCAPTION = "figcaption"),
    (e.FIGURE = "figure"),
    (e.FONT = "font"),
    (e.FOOTER = "footer"),
    (e.FOREIGN_OBJECT = "foreignObject"),
    (e.FORM = "form"),
    (e.FRAME = "frame"),
    (e.FRAMESET = "frameset"),
    (e.H1 = "h1"),
    (e.H2 = "h2"),
    (e.H3 = "h3"),
    (e.H4 = "h4"),
    (e.H5 = "h5"),
    (e.H6 = "h6"),
    (e.HEAD = "head"),
    (e.HEADER = "header"),
    (e.HGROUP = "hgroup"),
    (e.HR = "hr"),
    (e.HTML = "html"),
    (e.I = "i"),
    (e.IMG = "img"),
    (e.IMAGE = "image"),
    (e.INPUT = "input"),
    (e.IFRAME = "iframe"),
    (e.KEYGEN = "keygen"),
    (e.LABEL = "label"),
    (e.LI = "li"),
    (e.LINK = "link"),
    (e.LISTING = "listing"),
    (e.MAIN = "main"),
    (e.MALIGNMARK = "malignmark"),
    (e.MARQUEE = "marquee"),
    (e.MATH = "math"),
    (e.MENU = "menu"),
    (e.META = "meta"),
    (e.MGLYPH = "mglyph"),
    (e.MI = "mi"),
    (e.MO = "mo"),
    (e.MN = "mn"),
    (e.MS = "ms"),
    (e.MTEXT = "mtext"),
    (e.NAV = "nav"),
    (e.NOBR = "nobr"),
    (e.NOFRAMES = "noframes"),
    (e.NOEMBED = "noembed"),
    (e.NOSCRIPT = "noscript"),
    (e.OBJECT = "object"),
    (e.OL = "ol"),
    (e.OPTGROUP = "optgroup"),
    (e.OPTION = "option"),
    (e.P = "p"),
    (e.PARAM = "param"),
    (e.PLAINTEXT = "plaintext"),
    (e.PRE = "pre"),
    (e.RB = "rb"),
    (e.RP = "rp"),
    (e.RT = "rt"),
    (e.RTC = "rtc"),
    (e.RUBY = "ruby"),
    (e.S = "s"),
    (e.SCRIPT = "script"),
    (e.SEARCH = "search"),
    (e.SECTION = "section"),
    (e.SELECT = "select"),
    (e.SOURCE = "source"),
    (e.SMALL = "small"),
    (e.SPAN = "span"),
    (e.STRIKE = "strike"),
    (e.STRONG = "strong"),
    (e.STYLE = "style"),
    (e.SUB = "sub"),
    (e.SUMMARY = "summary"),
    (e.SUP = "sup"),
    (e.TABLE = "table"),
    (e.TBODY = "tbody"),
    (e.TEMPLATE = "template"),
    (e.TEXTAREA = "textarea"),
    (e.TFOOT = "tfoot"),
    (e.TD = "td"),
    (e.TH = "th"),
    (e.THEAD = "thead"),
    (e.TITLE = "title"),
    (e.TR = "tr"),
    (e.TRACK = "track"),
    (e.TT = "tt"),
    (e.U = "u"),
    (e.UL = "ul"),
    (e.SVG = "svg"),
    (e.VAR = "var"),
    (e.WBR = "wbr"),
    (e.XMP = "xmp"));
})(c || (c = {}));

export { c, E, O, g };
