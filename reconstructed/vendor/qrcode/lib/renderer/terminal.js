/**
 * qrcode/lib/renderer/terminal.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { qrTerminalRenderer } from "./terminal/terminal.js";
import { qrTerminalSmallRenderer } from "./terminal/terminal-small.js";

//@ chunk-spjgqa4y.js:54879-55012 cjs-fingerprint
var qrTerminalModule = x(function (Js) {
  var Fn = qrTerminalRenderer(),
    Dn = qrTerminalSmallRenderer();
  Js.render = function (t, e, r) {
    if (e && e.small) return Dn.render(t, e, r);
    return Fn.render(t, e, r);
  };
});

export { qrTerminalModule };
