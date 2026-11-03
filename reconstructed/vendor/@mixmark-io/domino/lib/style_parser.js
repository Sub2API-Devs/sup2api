/**
 * @mixmark-io/domino/lib/style_parser.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-vwj6ccer.js:76494-77213 cjs-fingerprint
var N0 = x(function (T0) {
  Object.defineProperty(T0, "__esModule", { value: !0 });
  T0.hyphenate = T0.parse = void 0;
  function hx(e) {
    let t = [],
      r = 0,
      a = 0,
      s = 0,
      c = 0,
      d = 0,
      g = null;
    while (r < e.length)
      switch (e.charCodeAt(r++)) {
        case 40:
          a++;
          break;
        case 41:
          a--;
          break;
        case 39:
          if (s === 0) s = 39;
          else if (s === 39 && e.charCodeAt(r - 1) !== 92) s = 0;
          break;
        case 34:
          if (s === 0) s = 34;
          else if (s === 34 && e.charCodeAt(r - 1) !== 92) s = 0;
          break;
        case 58:
          if (!g && a === 0 && s === 0) ((g = v0(e.substring(d, r - 1).trim())), (c = r));
          break;
        case 59:
          if (g && c > 0 && a === 0 && s === 0) {
            let trimmed = e.substring(c, r - 1).trim();
            (t.push(g, trimmed), (d = r), (c = 0), (g = null));
          }
          break;
      }
    if (g && c) {
      let trimmed = e.slice(c).trim();
      t.push(g, trimmed);
    }
    return t;
  }
  T0.parse = hx;
  function v0(e) {
    return e.replace(/[a-z][A-Z]/g, (t) => t.charAt(0) + "-" + t.charAt(1)).toLowerCase();
  }
  T0.hyphenate = v0;
});

export { N0 };
