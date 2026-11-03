/**
 * qrcode/lib/renderer/terminal/terminal.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";

//@ chunk-spjgqa4y.js:53699-54100 cjs-fingerprint
var qrTerminalRenderer = x(function (zs) {
  zs.render = function (t, e, r) {
    let size = t.modules.size,
      i = t.modules.data,
      o = "\x1B[40m  \x1B[0m",
      s = "\x1B[47m  \x1B[0m",
      l = "",
      joined = Array(size + 3).join("\x1B[47m  \x1B[0m"),
      joined_2 = Array(2).join("\x1B[47m  \x1B[0m");
    l +=
      joined +
      `
`;
    for (let a = 0; a < size; ++a) {
      l += "\x1B[47m  \x1B[0m";
      for (let h = 0; h < size; h++) l += i[a * size + h] ? "\x1B[40m  \x1B[0m" : "\x1B[47m  \x1B[0m";
      l +=
        joined_2 +
        `
`;
    }
    if (
      ((l +=
        joined +
        `
`),
      typeof r === "function")
    )
      r(null, l);
    return l;
  };
});

export { qrTerminalRenderer };
