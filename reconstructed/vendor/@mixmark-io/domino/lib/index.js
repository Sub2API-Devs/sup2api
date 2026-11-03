/**
 * @mixmark-io/domino/lib/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Er } from "./DOMImplementation.js";
import { va } from "./HTMLParser.js";
import { ii } from "./Window.js";
import { ni } from "./impl.js";

//@ chunk-vwj6ccer.js:237189-237838 cjs-fingerprint
var Bc = x(function (wf) {
  var Oc = Er(),
    qc = va(),
    eh = ii(),
    Hc = ni();
  wf.createDOMImplementation = function () {
    return new Oc(null);
  };
  wf.createDocument = function (e, t) {
    if (e || t) {
      var r = new qc();
      return (r.parse(e || "", !0), r.document());
    }
    return new Oc(null).createHTMLDocument("");
  };
  wf.createIncrementalHTMLParser = function () {
    var e = new qc();
    return {
      write: function (t) {
        if (t.length > 0)
          e.parse(t, !1, function () {
            return !0;
          });
      },
      end: function (t) {
        e.parse(t || "", !0, function () {
          return !0;
        });
      },
      process: function (t) {
        return e.parse("", !1, t);
      },
      document: function () {
        return e.document();
      },
    };
  };
  wf.createWindow = function (e, t) {
    var r = wf.createDocument(e);
    if (t !== void 0) r._address = t;
    return new Hc.Window(r);
  };
  wf.impl = Hc;
});

export { Bc };
