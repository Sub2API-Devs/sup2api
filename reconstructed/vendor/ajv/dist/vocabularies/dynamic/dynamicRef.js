/**
 * ajv/dist/vocabularies/dynamic/dynamicRef.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-1r4fv9mg.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { uh } from "../../compile/codegen/index.js";
import { DPe } from "../../compile/names.js";
import { _Xr } from "../core/ref.js";

//@ chunk-1r4fv9mg.js:1267-1958 cjs-fingerprint
var F = x(function (Z) {
  Object.defineProperty(Z, "__esModule", { value: !0 });
  Z.dynamicRef = void 0;
  var k = uh(),
    We = DPe(),
    M = _Xr(),
    Le = { keyword: "$dynamicRef", schemaType: "string", code: (e) => Y(e, e.schema) };
  function Y(e, r) {
    let { gen: gen, keyword: keyword, it: it } = e;
    if (r[0] !== "#") throw Error(`"${keyword}" only supports hash fragment reference`);
    let sliced = r.slice(1);
    if (it.allErrors) u();
    else {
      let s = gen.let("valid", !1);
      (u(s), e.ok(s));
    }
    function u(s) {
      if (it.schemaEnv.root.dynamicAnchors[sliced]) {
        let p = gen.let("_v", k._`${We.default.dynamicAnchors}${k.getProperty(sliced)}`);
        gen.if(p, m(p, s), m(it.validateName, s));
      } else m(it.validateName, s)();
    }
    function m(s, p) {
      return p
        ? () =>
            gen.block(() => {
              (M.callRef(e, s), gen.let(p, !0));
            })
        : () => M.callRef(e, s);
    }
  }
  Z.dynamicRef = Y;
  Z.default = Le;
});

export { F };
