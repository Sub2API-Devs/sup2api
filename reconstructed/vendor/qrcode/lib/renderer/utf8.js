/**
 * qrcode/lib/renderer/utf8.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../../runtime/bun-runtime.js";
import { we } from "./utils.js";

//@ chunk-spjgqa4y.js:52922-53699 cjs-fingerprint
var Sbo = x(function (Ys) {
  var kn = we(),
    Us = { WW: " ", WB: "\u2584", BB: "\u2588", BW: "\u2580" },
    Fs = { BB: " ", BW: "\u2584", WW: "\u2588", WB: "\u2580" };
  function Ds(t, e, r) {
    if (t && e) return r.BB;
    if (t && !e) return r.BW;
    if (!t && e) return r.WB;
    return r.WW;
  }
  Ys.render = function (t, e, r) {
    let options = kn.getOptions(e),
      i = Us;
    if (options.color.dark.hex === "#ffffff" || options.color.light.hex === "#000000") i = Fs;
    let size = t.modules.size,
      s = t.modules.data,
      l = "",
      joined = Array(size + options.margin * 2 + 1).join(i.WW);
    joined = Array(options.margin / 2 + 1).join(
      joined +
        `
`,
    );
    let joined_2 = Array(options.margin + 1).join(i.WW);
    l += joined;
    for (let a = 0; a < size; a += 2) {
      l += joined_2;
      for (let h = 0; h < size; h++) {
        let c = s[a * size + h],
          p = s[(a + 1) * size + h];
        l += Ds(c, p, i);
      }
      l +=
        joined_2 +
        `
`;
    }
    if (((l += joined.slice(0, -1)), typeof r === "function")) r(null, l);
    return l;
  };
  Ys.renderToFile = function (e, r, n, i) {
    if (typeof i > "u") ((i = n), (n = void 0));
    let o = importMetaRequire("fs"),
      render = Ys.render(r, n);
    o.writeFile(e, render, i);
  };
});

export { Sbo };
