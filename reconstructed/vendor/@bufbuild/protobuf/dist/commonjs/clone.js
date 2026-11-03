/**
 * @bufbuild/protobuf/dist/commonjs/clone.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { Ns } from "../cjs/descriptors.js";
import { Po } from "../cjs/reflect/reflect.js";
import { Uu } from "../cjs/reflect/guard.js";

//@ chunk-fq0cr76a.js:359538-360236 cjs-fingerprint
var n_ = x(function (Wk) {
  Object.defineProperty(Wk, "__esModule", { value: !0 });
  Wk.clone = qY;
  var Fk = Ns(),
    Vg = Po(),
    $k = Uu();
  function qY(e, n) {
    return Vk(Vg.reflect(e, n)).message;
  }
  function Vk(e) {
    let reflect = Vg.reflect(e.desc);
    for (let field of e.fields) {
      if (!e.isSet(field)) continue;
      switch (field.fieldKind) {
        case "list":
          let h = reflect.get(field);
          for (let b of e.get(field)) h.add(e_(field, b));
          break;
        case "map":
          let y = reflect.get(field);
          for (let b of e.get(field).entries()) y.set(b[0], e_(field, b[1]));
          break;
        default: {
          reflect.set(field, e_(field, e.get(field)));
          break;
        }
      }
    }
    let unknown = e.getUnknown();
    if (unknown && unknown.length > 0) reflect.setUnknown([...unknown]);
    return reflect;
  }
  function e_(e, n) {
    if (e.message !== void 0 && $k.isReflectMessage(n)) return Vk(n);
    if (e.scalar == Fk.ScalarType.BYTES && n instanceof Uint8Array) return n.slice();
    return n;
  }
});

export { n_ };
