/**
 * pngjs/lib/bitpacker.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: pngjs@5.0.0
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { se } from "./constants.js";

//@ chunk-spjgqa4y.js:37285-39166 cjs-fingerprint
var jr = x(function (Ql, Wr) {
  var T = se();
  Wr.exports = function (t, e, r, n) {
    let i = [T.COLORTYPE_COLOR_ALPHA, T.COLORTYPE_ALPHA].indexOf(n.colorType) !== -1;
    if (n.colorType === n.inputColorType) {
      let _ = (function () {
        let arrayBuffer = new ArrayBuffer(2);
        return (new DataView(arrayBuffer).setInt16(0, 256, !0), new Int16Array(arrayBuffer)[0] !== 256);
      })();
      if (n.bitDepth === 8 || (n.bitDepth === 16 && _)) return t;
    }
    let o = n.bitDepth !== 16 ? t : new Uint16Array(t.buffer),
      s = 255,
      l = T.COLORTYPE_TO_BPP_MAP[n.inputColorType];
    if (l === 4 && !n.inputHasAlpha) l = 3;
    let u = T.COLORTYPE_TO_BPP_MAP[n.colorType];
    if (n.bitDepth === 16) ((s = 65535), (u *= 2));
    let alloc = Buffer.alloc(e * r * u),
      a = 0,
      h = 0,
      c = n.bgColor || {};
    if (c.red === void 0) c.red = s;
    if (c.green === void 0) c.green = s;
    if (c.blue === void 0) c.blue = s;
    function p() {
      let _,
        w,
        m,
        E = s;
      switch (n.inputColorType) {
        case T.COLORTYPE_COLOR_ALPHA:
          ((E = o[a + 3]), (_ = o[a]), (w = o[a + 1]), (m = o[a + 2]));
          break;
        case T.COLORTYPE_COLOR:
          ((_ = o[a]), (w = o[a + 1]), (m = o[a + 2]));
          break;
        case T.COLORTYPE_ALPHA:
          ((E = o[a + 1]), (_ = o[a]), (w = _), (m = _));
          break;
        case T.COLORTYPE_GRAYSCALE:
          ((_ = o[a]), (w = _), (m = _));
          break;
        default:
          throw Error("input color type:" + n.inputColorType + " is not supported at present");
      }
      if (n.inputHasAlpha) {
        if (!i)
          ((E /= s),
            (_ = Math.min(Math.max(Math.round((1 - E) * c.red + E * _), 0), s)),
            (w = Math.min(Math.max(Math.round((1 - E) * c.green + E * w), 0), s)),
            (m = Math.min(Math.max(Math.round((1 - E) * c.blue + E * m), 0), s)));
      }
      return { red: _, green: w, blue: m, alpha: E };
    }
    for (let _ = 0; _ < r; _++)
      for (let w = 0; w < e; w++) {
        let m = p(o, a);
        switch (n.colorType) {
          case T.COLORTYPE_COLOR_ALPHA:
          case T.COLORTYPE_COLOR:
            if (n.bitDepth === 8) {
              if (((alloc[h] = m.red), (alloc[h + 1] = m.green), (alloc[h + 2] = m.blue), i))
                alloc[h + 3] = m.alpha;
            } else if (
              (alloc.writeUInt16BE(m.red, h),
              alloc.writeUInt16BE(m.green, h + 2),
              alloc.writeUInt16BE(m.blue, h + 4),
              i)
            )
              alloc.writeUInt16BE(m.alpha, h + 6);
            break;
          case T.COLORTYPE_ALPHA:
          case T.COLORTYPE_GRAYSCALE: {
            let E = (m.red + m.green + m.blue) / 3;
            if (n.bitDepth === 8) {
              if (((alloc[h] = E), i)) alloc[h + 1] = m.alpha;
            } else if ((alloc.writeUInt16BE(E, h), i)) alloc.writeUInt16BE(m.alpha, h + 2);
            break;
          }
          default:
            throw Error("unrecognised color Type " + n.colorType);
        }
        ((a += l), (h += u));
      }
    return alloc;
  };
});

export { jr };
