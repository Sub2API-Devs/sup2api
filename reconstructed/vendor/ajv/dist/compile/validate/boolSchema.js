/**
 * ajv/dist/compile/validate/boolSchema.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { ct } from "../errors.js";
import { uh } from "../codegen/index.js";
import { DPe } from "../names.js";

//@ chunk-s82q9s4x.js:24395-25072 cjs-fingerprint
var ks = x(function (Ps) {
  Object.defineProperty(Ps, "__esModule", { value: !0 });
  Ps.boolOrEmptySchema = Ps.topBoolOrEmptySchema = void 0;
  var bs = ct(),
    Es = uh(),
    Rc = DPe(),
    Ic = { message: "boolean schema is false" };
  function Tc(e) {
    let { gen: gen, schema: schema, validateName: validateName } = e;
    if (schema === !1) Ss(e, !1);
    else if (typeof schema == "object" && schema.$async === !0) gen.return(Rc.default.data);
    else (gen.assign(Es._`${validateName}.errors`, null), gen.return(!0));
  }
  Ps.topBoolOrEmptySchema = Tc;
  function Cc(e, t) {
    let { gen: gen, schema: schema } = e;
    if (schema === !1) (gen.var(t, !1), Ss(e));
    else gen.var(t, !0);
  }
  Ps.boolOrEmptySchema = Cc;
  function Ss(e, t) {
    let { gen: gen, data: s } = e;
    bs.reportError(
      {
        gen: gen,
        keyword: "false schema",
        data: s,
        schema: !1,
        schemaCode: !1,
        schemaValue: !1,
        params: {},
        it: e,
      },
      Ic,
      void 0,
      t,
    );
  }
});

export { ks };
