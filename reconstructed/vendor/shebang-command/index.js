/**
 * shebang-command/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: shebang-command@2.0.0
 * pieces: chunk-m4p5zn6n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";
import { At } from "../shebang-regex/index.js";

//@ chunk-m4p5zn6n.js:4922-5128 cjs-fingerprint
var _t = x(function (Si, Rt) {
  var sr = At();
  Rt.exports = (e = "") => {
    let match = e.match(sr);
    if (!match) return null;
    let [r, o] = match[0].replace(/#! ?/, "").split(" "),
      s = r.split("/").pop();
    if (s === "env") return o;
    return o ? `${s} ${o}` : s;
  };
});

export { _t };
