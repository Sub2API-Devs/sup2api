/**
 * qrcode/lib/browser.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Ue } from "./can-promise.js";
import { it } from "./core/qrcode.js";
import { jn } from "./renderer/canvas.js";
import { Bt } from "./renderer/svg-tag.js";

//@ chunk-spjgqa4y.js:57046-57866 cjs-fingerprint
var Qn = x(function (sl) {
  var ol = Ue(),
    ae = it(),
    Me = jn(),
    Jn = Bt();
  function It(t, e, r, n, i) {
    let o = [].slice.call(arguments, 1),
      s = o.length,
      l = typeof o[s - 1] === "function";
    if (!l && !ol()) throw Error("Callback required as last argument");
    if (l) {
      if (s < 2) throw Error("Too few arguments provided");
      if (s === 2) ((i = r), (r = e), (e = n = void 0));
      else if (s === 3)
        if (e.getContext && typeof i > "u") ((i = n), (n = void 0));
        else ((i = n), (n = r), (r = e), (e = void 0));
    } else {
      if (s < 1) throw Error("Too few arguments provided");
      if (s === 1) ((r = e), (e = n = void 0));
      else if (s === 2 && !e.getContext) ((n = r), (r = e), (e = void 0));
      return new Promise(function (u, f) {
        try {
          let create = ae.create(r, n);
          u(t(create, e, n));
        } catch (error) {
          f(error);
        }
      });
    }
    try {
      let create = ae.create(r, n);
      i(null, t(create, e, n));
    } catch (error) {
      i(error);
    }
  }
  sl.create = ae.create;
  sl.toCanvas = It.bind(null, Me.render);
  sl.toDataURL = It.bind(null, Me.renderToDataURL);
  sl.toString = It.bind(null, function (t, e, r) {
    return Jn.render(t, r);
  });
});

export { Qn };
