/**
 * base64-js/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: base64-js@1.5.1
 * pieces: chunk-na3pph4p.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";

//@ chunk-na3pph4p.js:55402-56876 cjs-fingerprint
var Un = x(function (vu) {
  vu.byteLength = mu;
  vu.toByteArray = wu;
  vu.fromByteArray = Cu;
  var Ne = [],
    _e = [],
    _u = typeof Uint8Array < "u" ? Uint8Array : Array,
    Lr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  for (He = 0, Gr = Lr.length; He < Gr; ++He) ((Ne[He] = Lr[He]), (_e[Lr.charCodeAt(He)] = He));
  var He, Gr;
  _e[45] = 62;
  _e[95] = 63;
  function In(e) {
    var t = e.length;
    if (t % 4 > 0) throw Error("Invalid string. Length must be a multiple of 4");
    var index = e.indexOf("=");
    if (index === -1) index = t;
    var s = index === t ? 0 : 4 - (index % 4);
    return [index, s];
  }
  function mu(e) {
    var t = In(e),
      r = t[0],
      s = t[1];
    return ((r + s) * 3) / 4 - s;
  }
  function Eu(e, t, r) {
    return ((t + r) * 3) / 4 - r;
  }
  function wu(e) {
    var t,
      r = In(e),
      s = r[0],
      n = r[1],
      a = new _u(Eu(e, s, n)),
      h = 0,
      g = n > 0 ? s - 4 : s,
      E;
    for (E = 0; E < g; E += 4)
      ((t =
        (_e[e.charCodeAt(E)] << 18) |
        (_e[e.charCodeAt(E + 1)] << 12) |
        (_e[e.charCodeAt(E + 2)] << 6) |
        _e[e.charCodeAt(E + 3)]),
        (a[h++] = (t >> 16) & 255),
        (a[h++] = (t >> 8) & 255),
        (a[h++] = t & 255));
    if (n === 2) ((t = (_e[e.charCodeAt(E)] << 2) | (_e[e.charCodeAt(E + 1)] >> 4)), (a[h++] = t & 255));
    if (n === 1)
      ((t = (_e[e.charCodeAt(E)] << 10) | (_e[e.charCodeAt(E + 1)] << 4) | (_e[e.charCodeAt(E + 2)] >> 2)),
        (a[h++] = (t >> 8) & 255),
        (a[h++] = t & 255));
    return a;
  }
  function Au(e) {
    return Ne[(e >> 18) & 63] + Ne[(e >> 12) & 63] + Ne[(e >> 6) & 63] + Ne[e & 63];
  }
  function Tu(e, t, r) {
    var s,
      n = [];
    for (var a = t; a < r; a += 3)
      ((s = ((e[a] << 16) & 16711680) + ((e[a + 1] << 8) & 65280) + (e[a + 2] & 255)), n.push(Au(s)));
    return n.join("");
  }
  function Cu(e) {
    var t,
      r = e.length,
      s = r % 3,
      n = [],
      a = 16383;
    for (var h = 0, g = r - s; h < g; h += a) n.push(Tu(e, h, h + a > g ? g : h + a));
    if (s === 1) ((t = e[r - 1]), n.push(Ne[t >> 2] + Ne[(t << 4) & 63] + "=="));
    else if (s === 2)
      ((t = (e[r - 2] << 8) + e[r - 1]), n.push(Ne[t >> 10] + Ne[(t >> 4) & 63] + Ne[(t << 2) & 63] + "="));
    return n.join("");
  }
});

export { Un };
