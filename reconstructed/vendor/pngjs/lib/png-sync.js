/**
 * pngjs/lib/png-sync.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: pngjs@5.0.0
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Tn } from "./parser-sync.js";
import { Bn } from "./packer-sync.js";

//@ chunk-spjgqa4y.js:47987-48112 cjs-fingerprint
var In = x(function (Ts) {
  var ws = Tn(),
    Es = Bn();
  Ts.read = function (t, e) {
    return ws(t, e || {});
  };
  Ts.write = function (t, e) {
    return Es(t, e);
  };
});

export { In };
