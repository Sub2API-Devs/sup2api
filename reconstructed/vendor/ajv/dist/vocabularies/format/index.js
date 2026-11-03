/**
 * ajv/dist/vocabularies/format/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-1r4fv9mg.js (3), chunk-s82q9s4x.js (2)
 * attribution: cjs-require-graph 5
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { T } from "../dynamic/dynamicAnchor.js";
import { F } from "../dynamic/dynamicRef.js";
import { te } from "../dynamic/recursiveAnchor.js";
import { ne } from "../dynamic/recursiveRef.js";
import { ce } from "../validation/dependentRequired.js";
import { me } from "../applicator/dependentSchemas.js";
import { pe } from "../validation/limitContains.js";
import { ge } from "../unevaluated/unevaluatedProperties.js";
import { ve } from "../unevaluated/unevaluatedItems.js";
import { Rr } from "../applicator/additionalItems.js";
import { ui } from "../applicator/prefixItems.js";
import { Ir } from "../applicator/items.js";
import { hi } from "../applicator/items2020.js";
import { yi } from "../applicator/contains.js";
import { bXr } from "../applicator/dependencies.js";
import { Pi } from "../applicator/propertyNames.js";
import { Tr } from "../applicator/additionalProperties.js";
import { ji } from "../applicator/properties.js";
import { Ri } from "../applicator/patternProperties.js";
import { Ci } from "../applicator/not.js";
import { Di } from "../applicator/anyOf.js";
import { Ui } from "../applicator/oneOf.js";
import { Li } from "../applicator/allOf.js";
import { Ji } from "../applicator/if.js";
import { Qi } from "../applicator/thenElse.js";
import { Zi } from "./format.js";

//@ chunk-1r4fv9mg.js:2409-2580 cjs-require-graph
var se = x(function (oe) {
  Object.defineProperty(oe, "__esModule", { value: !0 });
  var Xe = T(),
    Ye = F(),
    Ze = te(),
    Be = ne(),
    Je = [Xe.default, Ye.default, Ze.default, Be.default];
  oe.default = Je;
});
//@ chunk-1r4fv9mg.js:3298-3452 cjs-require-graph
var ye = x(function (he) {
  Object.defineProperty(he, "__esModule", { value: !0 });
  var st = ce(),
    it = me(),
    ct = pe(),
    ut = [st.default, it.default, ct.default];
  he.default = ut;
});
//@ chunk-1r4fv9mg.js:5354-5489 cjs-require-graph
var je = x(function (_e) {
  Object.defineProperty(_e, "__esModule", { value: !0 });
  var gt = ge(),
    bt = ve(),
    vt = [gt.default, bt.default];
  _e.default = vt;
});
//@ chunk-s82q9s4x.js:105960-106427 cjs-require-graph
var FQo = x(function (Xi) {
  Object.defineProperty(Xi, "__esModule", { value: !0 });
  var Up = Rr(),
    Kp = ui(),
    Fp = Ir(),
    Lp = hi(),
    Hp = yi(),
    Gp = bXr(),
    Jp = Pi(),
    Wp = Tr(),
    Bp = ji(),
    Qp = Ri(),
    Xp = Ci(),
    Yp = Di(),
    Zp = Ui(),
    eh = Li(),
    th = Ji(),
    rh = Qi();
  function sh(e = !1) {
    let t = [
      Xp.default,
      Yp.default,
      Zp.default,
      eh.default,
      th.default,
      rh.default,
      Jp.default,
      Wp.default,
      Gp.default,
      Bp.default,
      Qp.default,
    ];
    if (e) t.push(Kp.default, Lp.default);
    else t.push(Up.default, Fp.default);
    return (t.push(Hp.default), t);
  }
  Xi.default = sh;
});
//@ chunk-s82q9s4x.js:108297-108414 cjs-require-graph
var UQo = x(function (ea) {
  Object.defineProperty(ea, "__esModule", { value: !0 });
  var ch = Zi(),
    lh = [ch.default];
  ea.default = lh;
});

export { FQo, se, ye, je, UQo };
