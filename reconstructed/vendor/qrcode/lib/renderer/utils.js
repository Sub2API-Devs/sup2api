/**
 * qrcode/lib/renderer/utils.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-spjgqa4y.js:50618-52033 cjs-fingerprint
var we = x(function (Ls) {
  function Rn(t) {
    if (typeof t === "number") t = t.toString();
    if (typeof t !== "string") throw Error("Color should be defined as hex string");
    let parts = t.slice().replace("#", "").split("");
    if (parts.length < 3 || parts.length === 5 || parts.length > 8) throw Error("Invalid hex color: " + t);
    if (parts.length === 3 || parts.length === 4)
      parts = Array.prototype.concat.apply(
        [],
        parts.map(function (n) {
          return [n, n];
        }),
      );
    if (parts.length === 6) parts.push("F", "F");
    let r = parseInt(parts.join(""), 16);
    return {
      r: (r >> 24) & 255,
      g: (r >> 16) & 255,
      b: (r >> 8) & 255,
      a: r & 255,
      hex: "#" + parts.slice(0, 6).join(""),
    };
  }
  Ls.getOptions = function (e) {
    if (!e) e = {};
    if (!e.color) e.color = {};
    let r = typeof e.margin > "u" || e.margin === null || e.margin < 0 ? 4 : e.margin,
      n = e.width && e.width >= 21 ? e.width : void 0,
      i = e.scale || 4;
    return {
      width: n,
      scale: n ? 4 : i,
      margin: r,
      color: { dark: Rn(e.color.dark || "#000000ff"), light: Rn(e.color.light || "#ffffffff") },
      type: e.type,
      rendererOpts: e.rendererOpts || {},
    };
  };
  Ls.getScale = function (e, r) {
    return r.width && r.width >= e + r.margin * 2 ? r.width / (e + r.margin * 2) : r.scale;
  };
  Ls.getImageWidth = function (e, r) {
    let scale = Ls.getScale(e, r);
    return Math.floor((e + r.margin * 2) * scale);
  };
  Ls.qrToImageData = function (e, r, n) {
    let size = r.modules.size,
      o = r.modules.data,
      scale = Ls.getScale(size, n),
      floored = Math.floor((size + n.margin * 2) * scale),
      u = n.margin * scale,
      f = [n.color.light, n.color.dark];
    for (let a = 0; a < floored; a++)
      for (let h = 0; h < floored; h++) {
        let c = (a * floored + h) * 4,
          light = n.color.light;
        if (a >= u && h >= u && a < floored - u && h < floored - u) {
          let floored = Math.floor((a - u) / scale),
            floored_2 = Math.floor((h - u) / scale);
          light = f[o[floored * size + floored_2] ? 1 : 0];
        }
        ((e[c++] = light.r), (e[c++] = light.g), (e[c++] = light.b), (e[c] = light.a));
      }
  };
});

export { we };
