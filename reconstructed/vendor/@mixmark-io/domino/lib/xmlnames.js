/**
 * @mixmark-io/domino/lib/xmlnames.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-vwj6ccer.js:24885-26129 cjs-fingerprint
var $r = x(function (Nl) {
  Nl.isValidName = Tl;
  Nl.isValidQName = yl;
  var ml = /^[_:A-Za-z][-.:\w]+$/,
    gl = /^([_A-Za-z][-.\w]+|[_A-Za-z][-.\w]+:[_A-Za-z][-.\w]+)$/,
    nr =
      "_A-Za-z\xC0-\xD6\xD8-\xF6\xF8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD",
    ir =
      "-._A-Za-z0-9\xB7\xC0-\xD6\xD8-\xF6\xF8-\u02FF\u0300-\u037D\u037F-\u1FFF\u200C\u200D\u203F\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD",
    Nt = "[" + nr + "][" + ir + "]*",
    cn = nr + ":",
    on = ir + ":",
    regExp = new RegExp("^[" + cn + "][" + on + "]*$"),
    regExp_2 = new RegExp("^(" + Nt + "|" + Nt + ":" + Nt + ")$"),
    us = /[\uD800-\uDB7F\uDC00-\uDFFF]/,
    ls = /[\uD800-\uDB7F\uDC00-\uDFFF]/g,
    xs = /[\uD800-\uDB7F][\uDC00-\uDFFF]/g;
  nr += "\uD800-\uDB7F\uDC00-\uDFFF";
  ir += "\uD800-\uDB7F\uDC00-\uDFFF";
  Nt = "[" + nr + "][" + ir + "]*";
  cn = nr + ":";
  on = ir + ":";
  var regExp_3 = new RegExp("^[" + cn + "][" + on + "]*$"),
    regExp_4 = new RegExp("^(" + Nt + "|" + Nt + ":" + Nt + ")$");
  function Tl(e) {
    if (ml.test(e)) return !0;
    if (regExp.test(e)) return !0;
    if (!us.test(e)) return !1;
    if (!regExp_3.test(e)) return !1;
    var match = e.match(ls),
      match_2 = e.match(xs);
    return match_2 !== null && 2 * match_2.length === match.length;
  }
  function yl(e) {
    if (gl.test(e)) return !0;
    if (regExp_2.test(e)) return !0;
    if (!us.test(e)) return !1;
    if (!regExp_4.test(e)) return !1;
    var match = e.match(ls),
      match_2 = e.match(xs);
    return match_2 !== null && 2 * match_2.length === match.length;
  }
});

export { $r };
