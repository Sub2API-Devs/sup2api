/**
 * @anthropic-ai/sdk/internal/decoders/line.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { Kn, ke } from "../tslib.mjs";
import { h4t, uu, decodeUtf8 } from "../utils/bytes.mjs";

//@ chunk-hwmsct5x.js:27813-28807 esm-layout
var et,
  tt,
  Vo = (() => {
    class e {
      constructor() {
        (et.set(this, void 0),
          tt.set(this, void 0),
          Kn(this, et, new Uint8Array(), "f"),
          Kn(this, tt, null, "f"));
      }
      decode(n) {
        if (n == null) return [];
        let r = n instanceof ArrayBuffer ? new Uint8Array(n) : typeof n === "string" ? h4t(n) : n;
        Kn(this, et, uu([ke(this, et, "f"), r]), "f");
        let s = [],
          h;
        while ((h = Nh(ke(this, et, "f"), ke(this, tt, "f"))) != null) {
          if (h.carriage && ke(this, tt, "f") == null) {
            Kn(this, tt, h.index, "f");
            continue;
          }
          if (ke(this, tt, "f") != null && (h.index !== ke(this, tt, "f") + 1 || h.carriage)) {
            (s.push(decodeUtf8(ke(this, et, "f").subarray(0, ke(this, tt, "f") - 1))),
              Kn(this, et, ke(this, et, "f").subarray(ke(this, tt, "f")), "f"),
              Kn(this, tt, null, "f"));
            continue;
          }
          let y = ke(this, tt, "f") !== null ? h.preceding - 1 : h.preceding,
            w = decodeUtf8(ke(this, et, "f").subarray(0, y));
          (s.push(w), Kn(this, et, ke(this, et, "f").subarray(h.index), "f"), Kn(this, tt, null, "f"));
        }
        return s;
      }
      flush() {
        if (!ke(this, et, "f").length) return [];
        return this.decode(`
`);
      }
    }
    return (
      (et = new WeakMap()),
      (tt = new WeakMap()),
      (e.NEWLINE_CHARS = new Set([
        `
`,
        "\r",
      ])),
      (e.NEWLINE_REGEXP = /\r\n|[\n\r]/g),
      e
    );
  })();
//@ chunk-hwmsct5x.js:28807-28977 esm-fingerprint
function Nh(e, n) {
  for (let h = n ?? 0; h < e.length; h++) {
    if (e[h] === 10) return { preceding: h, index: h + 1, carriage: !1 };
    if (e[h] === 13) return { preceding: h, index: h + 1, carriage: !0 };
  }
  return null;
}

export { Vo };
