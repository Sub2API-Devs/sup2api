/**
 * @bufbuild/cel/dist/cjs/equals.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { ba } from "../../../protobuf/dist/commonjs/reflect/index.js";
import { ld } from "./eval.js";
import { li } from "../../../protobuf/dist/commonjs/index.js";
import { $o } from "./list.js";
import { Aa } from "./map.js";
import { Bi } from "./uint.js";
import { Ei } from "./type.js";

//@ chunk-fq0cr76a.js:482325-483569 cjs-fingerprint
var F_ = x(function (fB) {
  Object.defineProperty(fB, "__esModule", { value: !0 });
  fB.equals = B_;
  fB.equalsType = dB;
  var ky = ba(),
    cB = ld(),
    uB = li(),
    Dy = $o(),
    Oy = Aa(),
    Py = Bi(),
    Ly = Ei();
  function B_(e, n) {
    if (e === n) return !0;
    if (Py.isCelUint(e)) e = e.value;
    if (Py.isCelUint(n)) n = n.value;
    if ((typeof e === "number" || typeof e === "bigint") && (typeof n === "number" || typeof n === "bigint"))
      return e == n;
    switch (!0) {
      case e instanceof Uint8Array:
        return n instanceof Uint8Array && Vee(e, n);
      case Dy.isCelList(e):
        return Dy.isCelList(n) && Mee(e, n);
      case Oy.isCelMap(e):
        return Oy.isCelMap(n) && $ee(e, n);
      case Ly.isCelType(e):
        return Ly.isCelType(n) && dB(e, n);
    }
    if (ky.isReflectMessage(e)) {
      if (!ky.isReflectMessage(n)) return !1;
      if (e.desc.typeName !== n.desc.typeName) return !1;
      return uB.equals(e.desc, e.message, n.message, {
        registry: cB.getEvalContext().registry,
        unpackAny: !0,
        unknown: !0,
        extensions: !0,
      });
    }
    return !1;
  }
  function dB(e, n) {
    return e.kind === n.kind && e.name === n.name;
  }
  function Mee(e, n) {
    if (e.size !== n.size) return !1;
    for (let r = 0; r < e.size; r++) if (!B_(e.get(r), n.get(r))) return !1;
    return !0;
  }
  function $ee(e, n) {
    if (e.size !== n.size) return !1;
    for (let [r, s] of e) {
      let h = n.get(r);
      if (h === void 0 || !B_(s, h)) return !1;
    }
    return !0;
  }
  function Vee(e, n) {
    if (e.length !== n.length) return !1;
    for (let r = 0; r < e.length; r++) if (e[r] !== n[r]) return !1;
    return !0;
  }
});

export { F_ };
