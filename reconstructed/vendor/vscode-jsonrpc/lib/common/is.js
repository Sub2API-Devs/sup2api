/**
 * vscode-jsonrpc/lib/common/is.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: vscode-jsonrpc@8.2.0..8.2.1
 * pieces: chunk-t4ksmxzx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-t4ksmxzx.js:4056-4638 cjs-fingerprint
var we = x(function (Jt) {
  Object.defineProperty(Jt, "__esModule", { value: !0 });
  Jt.stringArray = Jt.array = Jt.func = Jt.error = Jt.number = Jt.string = Jt.boolean = void 0;
  function ti(e) {
    return e === !0 || e === !1;
  }
  Jt.boolean = ti;
  function Ut(e) {
    return typeof e === "string" || e instanceof String;
  }
  Jt.string = Ut;
  function ri(e) {
    return typeof e === "number" || e instanceof Number;
  }
  Jt.number = ri;
  function ni(e) {
    return e instanceof Error;
  }
  Jt.error = ni;
  function ii(e) {
    return typeof e === "function";
  }
  Jt.func = ii;
  function Vt(e) {
    return Array.isArray(e);
  }
  Jt.array = Vt;
  function si(e) {
    return Vt(e) && e.every((r) => Ut(r));
  }
  Jt.stringArray = si;
});

export { we };
