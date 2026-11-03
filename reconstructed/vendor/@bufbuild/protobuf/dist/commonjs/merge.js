/**
 * @bufbuild/protobuf/dist/commonjs/merge.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { Po } from "../cjs/reflect/reflect.js";

//@ chunk-fq0cr76a.js:465470-466118 cjs-fingerprint
var tL = x(function (eL) {
  Object.defineProperty(eL, "__esModule", { value: !0 });
  eL.merge = rQ;
  var vy = Po();
  function rQ(e, n, r) {
    QP(vy.reflect(e, n), vy.reflect(e, r));
  }
  function QP(e, n) {
    var r, s;
    let $unknown = n.message.$unknown;
    if ($unknown !== void 0 && $unknown.length > 0)
      (((r = (s = e.message).$unknown) !== null && r !== void 0) || (s.$unknown = []),
        e.message.$unknown.push(...$unknown));
    for (let field of e.fields) {
      if (!n.isSet(field)) continue;
      switch (field.fieldKind) {
        case "scalar":
        case "enum":
          e.set(field, n.get(field));
          break;
        case "message":
          if (e.isSet(field)) QP(e.get(field), n.get(field));
          else e.set(field, n.get(field));
          break;
        case "list":
          let b = e.get(field);
          for (let w of n.get(field)) b.add(w);
          break;
        case "map":
          let S = e.get(field);
          for (let [w, R] of n.get(field)) S.set(w, R);
          break;
      }
    }
  }
});

export { tL };
