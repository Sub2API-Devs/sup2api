/**
 * ajv/dist/vocabularies/core/ref.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { jvn } from "../../compile/ref_error.js";
import { Q } from "../code.js";
import { uh } from "../../compile/codegen/index.js";
import { DPe } from "../../compile/names.js";
import { tlr } from "../../compile/index.js";
import { ew } from "../../compile/util.js";

//@ chunk-s82q9s4x.js:81297-83654 cjs-fingerprint
var _Xr = x(function (vo) {
  Object.defineProperty(vo, "__esModule", { value: !0 });
  vo.callRef = vo.getValidate = void 0;
  var Xd = jvn(),
    At = Q(),
    C = uh(),
    Qe = DPe(),
    Dt = tlr(),
    Ee = ew(),
    Yd = {
      keyword: "$ref",
      schemaType: "string",
      code(e) {
        let { gen: gen, schema: schema, it: it } = e,
          { baseId: baseId, schemaEnv: schemaEnv, validateName: validateName, opts: opts, self: c } = it,
          { root: root } = schemaEnv;
        if ((schema === "#" || schema === "#/") && baseId === root.baseId) return f();
        let l = Dt.resolveRef.call(c, root, baseId, schema);
        if (l === void 0) throw new Xd.default(it.opts.uriResolver, baseId, schema);
        if (l instanceof Dt.SchemaEnv) return b(l);
        return _(l);
        function f() {
          if (schemaEnv === root) return Mt(e, validateName, schemaEnv, schemaEnv.$async);
          let scopeValue = gen.scopeValue("root", { ref: root });
          return Mt(e, C._`${scopeValue}.validate`, root, root.$async);
        }
        function b(h) {
          let p = $o(e, h);
          Mt(e, p, h, h.$async);
        }
        function _(h) {
          let scopeValue = gen.scopeValue(
              "schema",
              opts.code.source === !0 ? { ref: h, code: C.stringify(h) } : { ref: h },
            ),
            y = gen.name("valid"),
            subschema = e.subschema(
              {
                schema: h,
                dataTypes: [],
                schemaPath: C.nil,
                topSchemaRef: scopeValue,
                errSchemaPath: schema,
              },
              y,
            );
          (e.mergeEvaluated(subschema), e.ok(y));
        }
      },
    };
  function $o(e, t) {
    let { gen: gen } = e;
    return t.validate
      ? gen.scopeValue("validate", { ref: t.validate })
      : C._`${gen.scopeValue("wrapper", { ref: t })}.validate`;
  }
  vo.getValidate = $o;
  function Mt(e, t, r, s) {
    let { gen: gen, it: it } = e,
      { allErrors: allErrors, schemaEnv: schemaEnv, opts: opts } = it,
      u = opts.passContext ? Qe.default.this : C.nil;
    if (s) l();
    else f();
    function l() {
      if (!schemaEnv.$async) throw Error("async schema referenced by sync schema");
      let h = gen.let("valid");
      (gen.try(
        () => {
          if ((gen.code(C._`await ${At.callValidateCode(e, t, u)}`), _(t), !allErrors)) gen.assign(h, !0);
        },
        (p) => {
          if ((gen.if(C._`!(${p} instanceof ${it.ValidationError})`, () => gen.throw(p)), b(p), !allErrors))
            gen.assign(h, !1);
        },
      ),
        e.ok(h));
    }
    function f() {
      e.result(
        At.callValidateCode(e, t, u),
        () => _(t),
        () => b(t),
      );
    }
    function b(h) {
      let p = C._`${h}.errors`;
      (gen.assign(
        Qe.default.vErrors,
        C._`${Qe.default.vErrors} === null ? ${p} : ${Qe.default.vErrors}.concat(${p})`,
      ),
        gen.assign(Qe.default.errors, C._`${Qe.default.vErrors}.length`));
    }
    function _(h) {
      var p;
      if (!it.opts.unevaluated) return;
      let y =
        (p = r === null || r === void 0 ? void 0 : r.validate) === null || p === void 0
          ? void 0
          : p.evaluated;
      if (it.props !== !0)
        if (y && !y.dynamicProps) {
          if (y.props !== void 0) it.props = Ee.mergeEvaluated.props(gen, y.props, it.props);
        } else {
          let v = gen.var("props", C._`${h}.evaluated.props`);
          it.props = Ee.mergeEvaluated.props(gen, v, it.props, C.Name);
        }
      if (it.items !== !0)
        if (y && !y.dynamicItems) {
          if (y.items !== void 0) it.items = Ee.mergeEvaluated.items(gen, y.items, it.items);
        } else {
          let v = gen.var("items", C._`${h}.evaluated.items`);
          it.items = Ee.mergeEvaluated.items(gen, v, it.items, C.Name);
        }
    }
  }
  vo.callRef = Mt;
  vo.default = Yd;
});

export { _Xr };
