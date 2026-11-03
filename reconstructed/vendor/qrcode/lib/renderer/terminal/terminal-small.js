/**
 * qrcode/lib/renderer/terminal/terminal-small.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";

//@ chunk-spjgqa4y.js:54100-54879 cjs-fingerprint
var qrTerminalSmallRenderer = x(function (Ws) {
  var vs = "\x1B[47m\x1B[30m",
    Vs = "\x1B[40m\x1B[37m",
    Ks = function (t, e, r) {
      return {
        "00": "\x1B[0m " + t,
        "01": "\x1B[0m" + e + "\u2584" + t,
        "02": "\x1B[0m" + r + "\u2584" + t,
        10: "\x1B[0m" + e + "\u2580" + t,
        11: " ",
        12: "\u2584",
        20: "\x1B[0m" + r + "\u2580" + t,
        21: "\u2580",
        22: "\u2588",
      };
    },
    Nn = function (t, e, r, n) {
      let i = e + 1;
      if (r >= i || n >= i || n < -1 || r < -1) return "0";
      if (r >= e || n >= e || n < 0 || r < 0) return "1";
      let o = n * e + r;
      return t[o] ? "2" : "1";
    },
    qn = function (t, e, r, n) {
      return Nn(t, e, r, n) + Nn(t, e, r, n + 1);
    };
  Ws.render = function (t, e, r) {
    let size = t.modules.size,
      i = t.modules.data,
      o = !!(e && e.inverse),
      s = e && e.inverse ? Vs : vs,
      f = Ks(s, o ? "\x1B[30m" : "\x1B[37m", o ? "\x1B[37m" : "\x1B[30m"),
      a =
        `\x1B[0m
` + s,
      h = s;
    for (let c = -1; c < size + 1; c += 2) {
      for (let p = -1; p < size; p++) h += f[qn(i, size, p, c)];
      h += f[qn(i, size, size, c)] + a;
    }
    if (((h += "\x1B[0m"), typeof r === "function")) r(null, h);
    return h;
  };
});

export { qrTerminalSmallRenderer };
