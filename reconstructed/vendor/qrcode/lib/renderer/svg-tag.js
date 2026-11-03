/**
 * qrcode/lib/renderer/svg-tag.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { we } from "./utils.js";

//@ chunk-spjgqa4y.js:55012-55959 cjs-fingerprint
var Bt = x(function ($s) {
  var zn = we();
  function Hn(t, e) {
    let r = t.a / 255,
      n = e + '="' + t.hex + '"';
    return r < 1 ? n + " " + e + '-opacity="' + r.toFixed(2).slice(1) + '"' : n;
  }
  function xt(t, e, r) {
    let n = t + e;
    if (typeof r < "u") n += " " + r;
    return n;
  }
  function Zs(t, e, r) {
    let n = "",
      i = 0,
      o = !1,
      s = 0;
    for (let l = 0; l < t.length; l++) {
      let floored = Math.floor(l % e),
        floored_2 = Math.floor(l / e);
      if (!floored && !o) o = !0;
      if (t[l]) {
        if ((s++, !(l > 0 && floored > 0 && t[l - 1])))
          ((n += o ? xt("M", floored + r, 0.5 + floored_2 + r) : xt("m", i, 0)), (i = 0), (o = !1));
        if (!(floored + 1 < e && t[l + 1])) ((n += xt("h", s)), (s = 0));
      } else i++;
    }
    return n;
  }
  $s.render = function (e, r, n) {
    let options = zn.getOptions(r),
      size = e.modules.size,
      s = e.modules.data,
      l = size + options.margin * 2,
      u = !options.color.light.a
        ? ""
        : "<path " + Hn(options.color.light, "fill") + ' d="M0 0h' + l + "v" + l + 'H0z"/>',
      f = "<path " + Hn(options.color.dark, "stroke") + ' d="' + Zs(s, size, options.margin) + '"/>',
      a = 'viewBox="0 0 ' + l + " " + l + '"',
      c =
        '<svg xmlns="http://www.w3.org/2000/svg" ' +
        (!options.width ? "" : 'width="' + options.width + '" height="' + options.width + '" ') +
        a +
        ' shape-rendering="crispEdges">' +
        u +
        f +
        `</svg>
`;
    if (typeof n === "function") n(null, c);
    return c;
  };
});

export { Bt };
