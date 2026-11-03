/**
 * @mixmark-io/domino/lib/NodeUtils.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { ee } from "./utils.js";

//@ chunk-vwj6ccer.js:12056-14225 cjs-fingerprint
var Qa = x(function (od, Ki) {
  Ki.exports = {
    serializeOne: ll,
    ɵescapeMatchingClosingTag: zi,
    ɵescapeClosingCommentTag: Wi,
    ɵescapeProcessingInstructionContent: Xi,
  };
  var Gi = ee(),
    NAMESPACE = Gi.NAMESPACE,
    Ui = { STYLE: !0, SCRIPT: !0, XMP: !0, IFRAME: !0, NOEMBED: !0, NOFRAMES: !0, PLAINTEXT: !0 },
    nl = {
      area: !0,
      base: !0,
      basefont: !0,
      bgsound: !0,
      br: !0,
      col: !0,
      embed: !0,
      frame: !0,
      hr: !0,
      img: !0,
      input: !0,
      keygen: !0,
      link: !0,
      meta: !0,
      param: !0,
      source: !0,
      track: !0,
      wbr: !0,
    },
    il = {},
    Vi = /[&<>\u00A0]/g,
    ji = /[&"<>\u00A0]/g;
  function sl(e) {
    if (!Vi.test(e)) return e;
    return e.replace(Vi, (t) => {
      switch (t) {
        case "&":
          return "&amp;";
        case "<":
          return "&lt;";
        case ">":
          return "&gt;";
        case "\xA0":
          return "&nbsp;";
      }
    });
  }
  function cl(e) {
    if (!ji.test(e)) return e;
    return e.replace(ji, (t) => {
      switch (t) {
        case "<":
          return "&lt;";
        case ">":
          return "&gt;";
        case "&":
          return "&amp;";
        case '"':
          return "&quot;";
        case "\xA0":
          return "&nbsp;";
      }
    });
  }
  function ol(e) {
    var namespaceURI = e.namespaceURI;
    if (!namespaceURI) return e.localName;
    if (namespaceURI === NAMESPACE.XML) return "xml:" + e.localName;
    if (namespaceURI === NAMESPACE.XLINK) return "xlink:" + e.localName;
    if (namespaceURI === NAMESPACE.XMLNS)
      if (e.localName === "xmlns") return "xmlns";
      else return "xmlns:" + e.localName;
    return e.name;
  }
  function zi(e, t) {
    let r = "</" + t;
    if (!e.toLowerCase().includes(r)) return e;
    let a = [...e],
      matchAll = e.matchAll(new RegExp(r, "ig"));
    for (let c of matchAll) a[c.index] = "&lt;";
    return a.join("");
  }
  var ul = /--!?>/;
  function Wi(e) {
    if (!ul.test(e)) return e;
    return e.replace(/(--\!?)>/g, "$1&gt;");
  }
  function Xi(e) {
    return e.includes(">") ? e.replaceAll(">", "&gt;") : e;
  }
  function ll(e, t) {
    var r = "";
    switch (e.nodeType) {
      case 1:
        var namespaceURI = e.namespaceURI,
          s = namespaceURI === NAMESPACE.HTML,
          c =
            s || namespaceURI === NAMESPACE.SVG || namespaceURI === NAMESPACE.MATHML
              ? e.localName
              : e.tagName;
        r += "<" + c;
        for (var d = 0, _numattrs = e._numattrs; d < _numattrs; d++) {
          var _attr = e._attr(d);
          if (((r += " " + ol(_attr)), _attr.value !== void 0)) r += '="' + cl(_attr.value) + '"';
        }
        if (((r += ">"), !(s && nl[c]))) {
          var serialize = e.serialize();
          if (Ui[c.toUpperCase()]) serialize = zi(serialize, c);
          if (
            s &&
            il[c] &&
            serialize.charAt(0) ===
              `
`
          )
            r += `
`;
          ((r += serialize), (r += "</" + c + ">"));
        }
        break;
      case 3:
      case 4:
        var T;
        if (t.nodeType === 1 && t.namespaceURI === NAMESPACE.HTML) T = t.tagName;
        else T = "";
        if (Ui[T] || (T === "NOSCRIPT" && t.ownerDocument._scripting_enabled)) r += e.data;
        else r += sl(e.data);
        break;
      case 8:
        r += "<!--" + Wi(e.data) + "-->";
        break;
      case 7:
        let ne = Xi(e.data);
        r += "<?" + e.target + " " + ne + "?>";
        break;
      case 10:
        ((r += "<!DOCTYPE " + e.name), (r += ">"));
        break;
      default:
        Gi.InvalidStateError();
    }
    return r;
  }
});

export { Qa };
