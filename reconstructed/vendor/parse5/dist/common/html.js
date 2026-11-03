/**
 * parse5/dist/common/html.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: parse5@7.2.0..7.2.1
 * pieces: chunk-6ja29j2n.js (5)
 * attribution: esm-layout 2, esm-fingerprint 3
 */
import { c, E } from "../../lib/common/html.js";

//@ chunk-6ja29j2n.js:65146-65152 esm-layout
var TAG_ID;
//@ chunk-6ja29j2n.js:65152-67836 esm-fingerprint
(function (TAG_ID) {
  TAG_ID[(TAG_ID.UNKNOWN = 0)] = "UNKNOWN";
  TAG_ID[(TAG_ID.A = 1)] = "A";
  TAG_ID[(TAG_ID.ADDRESS = 2)] = "ADDRESS";
  TAG_ID[(TAG_ID.ANNOTATION_XML = 3)] = "ANNOTATION_XML";
  TAG_ID[(TAG_ID.APPLET = 4)] = "APPLET";
  TAG_ID[(TAG_ID.AREA = 5)] = "AREA";
  TAG_ID[(TAG_ID.ARTICLE = 6)] = "ARTICLE";
  TAG_ID[(TAG_ID.ASIDE = 7)] = "ASIDE";
  TAG_ID[(TAG_ID.B = 8)] = "B";
  TAG_ID[(TAG_ID.BASE = 9)] = "BASE";
  TAG_ID[(TAG_ID.BASEFONT = 10)] = "BASEFONT";
  TAG_ID[(TAG_ID.BGSOUND = 11)] = "BGSOUND";
  TAG_ID[(TAG_ID.BIG = 12)] = "BIG";
  TAG_ID[(TAG_ID.BLOCKQUOTE = 13)] = "BLOCKQUOTE";
  TAG_ID[(TAG_ID.BODY = 14)] = "BODY";
  TAG_ID[(TAG_ID.BR = 15)] = "BR";
  TAG_ID[(TAG_ID.BUTTON = 16)] = "BUTTON";
  TAG_ID[(TAG_ID.CAPTION = 17)] = "CAPTION";
  TAG_ID[(TAG_ID.CENTER = 18)] = "CENTER";
  TAG_ID[(TAG_ID.CODE = 19)] = "CODE";
  TAG_ID[(TAG_ID.COL = 20)] = "COL";
  TAG_ID[(TAG_ID.COLGROUP = 21)] = "COLGROUP";
  TAG_ID[(TAG_ID.DD = 22)] = "DD";
  TAG_ID[(TAG_ID.DESC = 23)] = "DESC";
  TAG_ID[(TAG_ID.DETAILS = 24)] = "DETAILS";
  TAG_ID[(TAG_ID.DIALOG = 25)] = "DIALOG";
  TAG_ID[(TAG_ID.DIR = 26)] = "DIR";
  TAG_ID[(TAG_ID.DIV = 27)] = "DIV";
  TAG_ID[(TAG_ID.DL = 28)] = "DL";
  TAG_ID[(TAG_ID.DT = 29)] = "DT";
  TAG_ID[(TAG_ID.EM = 30)] = "EM";
  TAG_ID[(TAG_ID.EMBED = 31)] = "EMBED";
  TAG_ID[(TAG_ID.FIELDSET = 32)] = "FIELDSET";
  TAG_ID[(TAG_ID.FIGCAPTION = 33)] = "FIGCAPTION";
  TAG_ID[(TAG_ID.FIGURE = 34)] = "FIGURE";
  TAG_ID[(TAG_ID.FONT = 35)] = "FONT";
  TAG_ID[(TAG_ID.FOOTER = 36)] = "FOOTER";
  TAG_ID[(TAG_ID.FOREIGN_OBJECT = 37)] = "FOREIGN_OBJECT";
  TAG_ID[(TAG_ID.FORM = 38)] = "FORM";
  TAG_ID[(TAG_ID.FRAME = 39)] = "FRAME";
  TAG_ID[(TAG_ID.FRAMESET = 40)] = "FRAMESET";
  TAG_ID[(TAG_ID.H1 = 41)] = "H1";
  TAG_ID[(TAG_ID.H2 = 42)] = "H2";
  TAG_ID[(TAG_ID.H3 = 43)] = "H3";
  TAG_ID[(TAG_ID.H4 = 44)] = "H4";
  TAG_ID[(TAG_ID.H5 = 45)] = "H5";
  TAG_ID[(TAG_ID.H6 = 46)] = "H6";
  TAG_ID[(TAG_ID.HEAD = 47)] = "HEAD";
  TAG_ID[(TAG_ID.HEADER = 48)] = "HEADER";
  TAG_ID[(TAG_ID.HGROUP = 49)] = "HGROUP";
  TAG_ID[(TAG_ID.HR = 50)] = "HR";
  TAG_ID[(TAG_ID.HTML = 51)] = "HTML";
  TAG_ID[(TAG_ID.I = 52)] = "I";
  TAG_ID[(TAG_ID.IMG = 53)] = "IMG";
  TAG_ID[(TAG_ID.IMAGE = 54)] = "IMAGE";
  TAG_ID[(TAG_ID.INPUT = 55)] = "INPUT";
  TAG_ID[(TAG_ID.IFRAME = 56)] = "IFRAME";
  TAG_ID[(TAG_ID.KEYGEN = 57)] = "KEYGEN";
  TAG_ID[(TAG_ID.LABEL = 58)] = "LABEL";
  TAG_ID[(TAG_ID.LI = 59)] = "LI";
  TAG_ID[(TAG_ID.LINK = 60)] = "LINK";
  TAG_ID[(TAG_ID.LISTING = 61)] = "LISTING";
  TAG_ID[(TAG_ID.MAIN = 62)] = "MAIN";
  TAG_ID[(TAG_ID.MALIGNMARK = 63)] = "MALIGNMARK";
  TAG_ID[(TAG_ID.MARQUEE = 64)] = "MARQUEE";
  TAG_ID[(TAG_ID.MATH = 65)] = "MATH";
  TAG_ID[(TAG_ID.MENU = 66)] = "MENU";
  TAG_ID[(TAG_ID.META = 67)] = "META";
  TAG_ID[(TAG_ID.MGLYPH = 68)] = "MGLYPH";
  TAG_ID[(TAG_ID.MI = 69)] = "MI";
  TAG_ID[(TAG_ID.MO = 70)] = "MO";
  TAG_ID[(TAG_ID.MN = 71)] = "MN";
  TAG_ID[(TAG_ID.MS = 72)] = "MS";
  TAG_ID[(TAG_ID.MTEXT = 73)] = "MTEXT";
  TAG_ID[(TAG_ID.NAV = 74)] = "NAV";
  TAG_ID[(TAG_ID.NOBR = 75)] = "NOBR";
  TAG_ID[(TAG_ID.NOFRAMES = 76)] = "NOFRAMES";
  TAG_ID[(TAG_ID.NOEMBED = 77)] = "NOEMBED";
  TAG_ID[(TAG_ID.NOSCRIPT = 78)] = "NOSCRIPT";
  TAG_ID[(TAG_ID.OBJECT = 79)] = "OBJECT";
  TAG_ID[(TAG_ID.OL = 80)] = "OL";
  TAG_ID[(TAG_ID.OPTGROUP = 81)] = "OPTGROUP";
  TAG_ID[(TAG_ID.OPTION = 82)] = "OPTION";
  TAG_ID[(TAG_ID.P = 83)] = "P";
  TAG_ID[(TAG_ID.PARAM = 84)] = "PARAM";
  TAG_ID[(TAG_ID.PLAINTEXT = 85)] = "PLAINTEXT";
  TAG_ID[(TAG_ID.PRE = 86)] = "PRE";
  TAG_ID[(TAG_ID.RB = 87)] = "RB";
  TAG_ID[(TAG_ID.RP = 88)] = "RP";
  TAG_ID[(TAG_ID.RT = 89)] = "RT";
  TAG_ID[(TAG_ID.RTC = 90)] = "RTC";
  TAG_ID[(TAG_ID.RUBY = 91)] = "RUBY";
  TAG_ID[(TAG_ID.S = 92)] = "S";
  TAG_ID[(TAG_ID.SCRIPT = 93)] = "SCRIPT";
  TAG_ID[(TAG_ID.SEARCH = 94)] = "SEARCH";
  TAG_ID[(TAG_ID.SECTION = 95)] = "SECTION";
  TAG_ID[(TAG_ID.SELECT = 96)] = "SELECT";
  TAG_ID[(TAG_ID.SOURCE = 97)] = "SOURCE";
  TAG_ID[(TAG_ID.SMALL = 98)] = "SMALL";
  TAG_ID[(TAG_ID.SPAN = 99)] = "SPAN";
  TAG_ID[(TAG_ID.STRIKE = 100)] = "STRIKE";
  TAG_ID[(TAG_ID.STRONG = 101)] = "STRONG";
  TAG_ID[(TAG_ID.STYLE = 102)] = "STYLE";
  TAG_ID[(TAG_ID.SUB = 103)] = "SUB";
  TAG_ID[(TAG_ID.SUMMARY = 104)] = "SUMMARY";
  TAG_ID[(TAG_ID.SUP = 105)] = "SUP";
  TAG_ID[(TAG_ID.TABLE = 106)] = "TABLE";
  TAG_ID[(TAG_ID.TBODY = 107)] = "TBODY";
  TAG_ID[(TAG_ID.TEMPLATE = 108)] = "TEMPLATE";
  TAG_ID[(TAG_ID.TEXTAREA = 109)] = "TEXTAREA";
  TAG_ID[(TAG_ID.TFOOT = 110)] = "TFOOT";
  TAG_ID[(TAG_ID.TD = 111)] = "TD";
  TAG_ID[(TAG_ID.TH = 112)] = "TH";
  TAG_ID[(TAG_ID.THEAD = 113)] = "THEAD";
  TAG_ID[(TAG_ID.TITLE = 114)] = "TITLE";
  TAG_ID[(TAG_ID.TR = 115)] = "TR";
  TAG_ID[(TAG_ID.TRACK = 116)] = "TRACK";
  TAG_ID[(TAG_ID.TT = 117)] = "TT";
  TAG_ID[(TAG_ID.U = 118)] = "U";
  TAG_ID[(TAG_ID.UL = 119)] = "UL";
  TAG_ID[(TAG_ID.SVG = 120)] = "SVG";
  TAG_ID[(TAG_ID.VAR = 121)] = "VAR";
  TAG_ID[(TAG_ID.WBR = 122)] = "WBR";
  TAG_ID[(TAG_ID.XMP = 123)] = "XMP";
})(TAG_ID || (TAG_ID = {}));
//@ chunk-6ja29j2n.js:67836-69980 esm-fingerprint
var TAG_NAME_TO_ID = new Map([
  [c.A, TAG_ID.A],
  [c.ADDRESS, TAG_ID.ADDRESS],
  [c.ANNOTATION_XML, TAG_ID.ANNOTATION_XML],
  [c.APPLET, TAG_ID.APPLET],
  [c.AREA, TAG_ID.AREA],
  [c.ARTICLE, TAG_ID.ARTICLE],
  [c.ASIDE, TAG_ID.ASIDE],
  [c.B, TAG_ID.B],
  [c.BASE, TAG_ID.BASE],
  [c.BASEFONT, TAG_ID.BASEFONT],
  [c.BGSOUND, TAG_ID.BGSOUND],
  [c.BIG, TAG_ID.BIG],
  [c.BLOCKQUOTE, TAG_ID.BLOCKQUOTE],
  [c.BODY, TAG_ID.BODY],
  [c.BR, TAG_ID.BR],
  [c.BUTTON, TAG_ID.BUTTON],
  [c.CAPTION, TAG_ID.CAPTION],
  [c.CENTER, TAG_ID.CENTER],
  [c.CODE, TAG_ID.CODE],
  [c.COL, TAG_ID.COL],
  [c.COLGROUP, TAG_ID.COLGROUP],
  [c.DD, TAG_ID.DD],
  [c.DESC, TAG_ID.DESC],
  [c.DETAILS, TAG_ID.DETAILS],
  [c.DIALOG, TAG_ID.DIALOG],
  [c.DIR, TAG_ID.DIR],
  [c.DIV, TAG_ID.DIV],
  [c.DL, TAG_ID.DL],
  [c.DT, TAG_ID.DT],
  [c.EM, TAG_ID.EM],
  [c.EMBED, TAG_ID.EMBED],
  [c.FIELDSET, TAG_ID.FIELDSET],
  [c.FIGCAPTION, TAG_ID.FIGCAPTION],
  [c.FIGURE, TAG_ID.FIGURE],
  [c.FONT, TAG_ID.FONT],
  [c.FOOTER, TAG_ID.FOOTER],
  [c.FOREIGN_OBJECT, TAG_ID.FOREIGN_OBJECT],
  [c.FORM, TAG_ID.FORM],
  [c.FRAME, TAG_ID.FRAME],
  [c.FRAMESET, TAG_ID.FRAMESET],
  [c.H1, TAG_ID.H1],
  [c.H2, TAG_ID.H2],
  [c.H3, TAG_ID.H3],
  [c.H4, TAG_ID.H4],
  [c.H5, TAG_ID.H5],
  [c.H6, TAG_ID.H6],
  [c.HEAD, TAG_ID.HEAD],
  [c.HEADER, TAG_ID.HEADER],
  [c.HGROUP, TAG_ID.HGROUP],
  [c.HR, TAG_ID.HR],
  [c.HTML, TAG_ID.HTML],
  [c.I, TAG_ID.I],
  [c.IMG, TAG_ID.IMG],
  [c.IMAGE, TAG_ID.IMAGE],
  [c.INPUT, TAG_ID.INPUT],
  [c.IFRAME, TAG_ID.IFRAME],
  [c.KEYGEN, TAG_ID.KEYGEN],
  [c.LABEL, TAG_ID.LABEL],
  [c.LI, TAG_ID.LI],
  [c.LINK, TAG_ID.LINK],
  [c.LISTING, TAG_ID.LISTING],
  [c.MAIN, TAG_ID.MAIN],
  [c.MALIGNMARK, TAG_ID.MALIGNMARK],
  [c.MARQUEE, TAG_ID.MARQUEE],
  [c.MATH, TAG_ID.MATH],
  [c.MENU, TAG_ID.MENU],
  [c.META, TAG_ID.META],
  [c.MGLYPH, TAG_ID.MGLYPH],
  [c.MI, TAG_ID.MI],
  [c.MO, TAG_ID.MO],
  [c.MN, TAG_ID.MN],
  [c.MS, TAG_ID.MS],
  [c.MTEXT, TAG_ID.MTEXT],
  [c.NAV, TAG_ID.NAV],
  [c.NOBR, TAG_ID.NOBR],
  [c.NOFRAMES, TAG_ID.NOFRAMES],
  [c.NOEMBED, TAG_ID.NOEMBED],
  [c.NOSCRIPT, TAG_ID.NOSCRIPT],
  [c.OBJECT, TAG_ID.OBJECT],
  [c.OL, TAG_ID.OL],
  [c.OPTGROUP, TAG_ID.OPTGROUP],
  [c.OPTION, TAG_ID.OPTION],
  [c.P, TAG_ID.P],
  [c.PARAM, TAG_ID.PARAM],
  [c.PLAINTEXT, TAG_ID.PLAINTEXT],
  [c.PRE, TAG_ID.PRE],
  [c.RB, TAG_ID.RB],
  [c.RP, TAG_ID.RP],
  [c.RT, TAG_ID.RT],
  [c.RTC, TAG_ID.RTC],
  [c.RUBY, TAG_ID.RUBY],
  [c.S, TAG_ID.S],
  [c.SCRIPT, TAG_ID.SCRIPT],
  [c.SEARCH, TAG_ID.SEARCH],
  [c.SECTION, TAG_ID.SECTION],
  [c.SELECT, TAG_ID.SELECT],
  [c.SOURCE, TAG_ID.SOURCE],
  [c.SMALL, TAG_ID.SMALL],
  [c.SPAN, TAG_ID.SPAN],
  [c.STRIKE, TAG_ID.STRIKE],
  [c.STRONG, TAG_ID.STRONG],
  [c.STYLE, TAG_ID.STYLE],
  [c.SUB, TAG_ID.SUB],
  [c.SUMMARY, TAG_ID.SUMMARY],
  [c.SUP, TAG_ID.SUP],
  [c.TABLE, TAG_ID.TABLE],
  [c.TBODY, TAG_ID.TBODY],
  [c.TEMPLATE, TAG_ID.TEMPLATE],
  [c.TEXTAREA, TAG_ID.TEXTAREA],
  [c.TFOOT, TAG_ID.TFOOT],
  [c.TD, TAG_ID.TD],
  [c.TH, TAG_ID.TH],
  [c.THEAD, TAG_ID.THEAD],
  [c.TITLE, TAG_ID.TITLE],
  [c.TR, TAG_ID.TR],
  [c.TRACK, TAG_ID.TRACK],
  [c.TT, TAG_ID.TT],
  [c.U, TAG_ID.U],
  [c.UL, TAG_ID.UL],
  [c.SVG, TAG_ID.SVG],
  [c.VAR, TAG_ID.VAR],
  [c.WBR, TAG_ID.WBR],
  [c.XMP, TAG_ID.XMP],
]);
//@ chunk-6ja29j2n.js:69980-70051 esm-fingerprint
function getTagID(tagName) {
  var _a;
  return (_a = TAG_NAME_TO_ID.get(tagName)) !== null && _a !== undefined ? _a : TAG_ID.UNKNOWN;
}
//@ chunk-6ja29j2n.js:70051-71013 esm-layout
var $ = TAG_ID;
var SPECIAL_ELEMENTS = {
  [E.HTML]: new Set([
    $.ADDRESS,
    $.APPLET,
    $.AREA,
    $.ARTICLE,
    $.ASIDE,
    $.BASE,
    $.BASEFONT,
    $.BGSOUND,
    $.BLOCKQUOTE,
    $.BODY,
    $.BR,
    $.BUTTON,
    $.CAPTION,
    $.CENTER,
    $.COL,
    $.COLGROUP,
    $.DD,
    $.DETAILS,
    $.DIR,
    $.DIV,
    $.DL,
    $.DT,
    $.EMBED,
    $.FIELDSET,
    $.FIGCAPTION,
    $.FIGURE,
    $.FOOTER,
    $.FORM,
    $.FRAME,
    $.FRAMESET,
    $.H1,
    $.H2,
    $.H3,
    $.H4,
    $.H5,
    $.H6,
    $.HEAD,
    $.HEADER,
    $.HGROUP,
    $.HR,
    $.HTML,
    $.IFRAME,
    $.IMG,
    $.INPUT,
    $.LI,
    $.LINK,
    $.LISTING,
    $.MAIN,
    $.MARQUEE,
    $.MENU,
    $.META,
    $.NAV,
    $.NOEMBED,
    $.NOFRAMES,
    $.NOSCRIPT,
    $.OBJECT,
    $.OL,
    $.P,
    $.PARAM,
    $.PLAINTEXT,
    $.PRE,
    $.SCRIPT,
    $.SECTION,
    $.SELECT,
    $.SOURCE,
    $.STYLE,
    $.SUMMARY,
    $.TABLE,
    $.TBODY,
    $.TD,
    $.TEMPLATE,
    $.TEXTAREA,
    $.TFOOT,
    $.TH,
    $.THEAD,
    $.TITLE,
    $.TR,
    $.TRACK,
    $.UL,
    $.WBR,
    $.XMP,
  ]),
  [E.MATHML]: new Set([$.MI, $.MO, $.MN, $.MS, $.MTEXT, $.ANNOTATION_XML]),
  [E.SVG]: new Set([$.TITLE, $.FOREIGN_OBJECT, $.DESC]),
  [E.XLINK]: new Set(),
  [E.XML]: new Set(),
  [E.XMLNS]: new Set(),
};
var H = new Set([$.H1, $.H2, $.H3, $.H4, $.H5, $.H6]);
var UNESCAPED_TEXT = new Set([c.STYLE, c.SCRIPT, c.XMP, c.IFRAME, c.NOEMBED, c.NOFRAMES, c.PLAINTEXT]);
export { TAG_ID, getTagID, H, SPECIAL_ELEMENTS };
