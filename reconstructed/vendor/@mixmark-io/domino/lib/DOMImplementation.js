/**
 * @mixmark-io/domino/lib/DOMImplementation.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { fa } from "./Document.js";
import { ha } from "./DocumentType.js";
import { va } from "./HTMLParser.js";
import { ee } from "./utils.js";
import { $r } from "./xmlnames.js";

//@ chunk-vwj6ccer.js:233747-234995 cjs-fingerprint
var Er = x(function (Yd, Sc) {
  Sc.exports = wc;
  var yc = fa(),
    Nc = ha(),
    pf = va(),
    Ta = ee(),
    mf = $r();
  function wc(e) {
    this.contextObject = e;
  }
  var gf = {
    xml: { "": !0, "1.0": !0, "2.0": !0 },
    core: { "": !0, "2.0": !0 },
    html: { "": !0, "1.0": !0, "2.0": !0 },
    xhtml: { "": !0, "1.0": !0, "2.0": !0 },
  };
  wc.prototype = {
    hasFeature: function (t, r) {
      var a = gf[(t || "").toLowerCase()];
      return (a && a[r || ""]) || !1;
    },
    createDocumentType: function (t, r, a) {
      if (!mf.isValidQName(t)) Ta.InvalidCharacterError();
      return new Nc(this.contextObject, t, r, a);
    },
    createDocument: function (t, r, a) {
      var s = new yc(!1, null),
        c;
      if (r) c = s.createElementNS(t, r);
      else c = null;
      if (a) s.appendChild(a);
      if (c) s.appendChild(c);
      if (t === Ta.NAMESPACE.HTML) s._contentType = "application/xhtml+xml";
      else if (t === Ta.NAMESPACE.SVG) s._contentType = "image/svg+xml";
      else s._contentType = "application/xml";
      return s;
    },
    createHTMLDocument: function (t) {
      var r = new yc(!0, null);
      r.appendChild(new Nc(r, "html"));
      var element = r.createElement("html");
      r.appendChild(element);
      var element_2 = r.createElement("head");
      if ((element.appendChild(element_2), t !== void 0)) {
        var element_3 = r.createElement("title");
        (element_2.appendChild(element_3), element_3.appendChild(r.createTextNode(t)));
      }
      return (element.appendChild(r.createElement("body")), (r.modclock = 1), r);
    },
    mozSetOutputMutationHandler: function (e, t) {
      e.mutationHandler = t;
    },
    mozGetInputMutationHandler: function (e) {
      Ta.nyi();
    },
    mozHTMLParser: pf,
  };
});

export { Er };
