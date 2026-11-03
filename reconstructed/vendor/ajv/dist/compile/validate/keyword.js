/**
 * ajv/dist/compile/validate/keyword.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { uh } from "../codegen/index.js";
import { DPe } from "../names.js";
import { Q } from "../../vocabularies/code.js";
import { ct } from "../errors.js";

//@ chunk-s82q9s4x.js:33752-36663 cjs-fingerprint
var sn = x(function (tn) {
  Object.defineProperty(tn, "__esModule", { value: !0 });
  tn.validateKeywordUsage = tn.validSchemaType = tn.funcKeywordCode = tn.macroKeywordCode = void 0;
  var I = uh(),
    Ce = DPe(),
    Ys = Q(),
    Zs = ct();
  function ku(e, t) {
    let { gen: gen, keyword: keyword, schema: schema, parentSchema: parentSchema, it: it } = e,
      a = t.macro.call(it.self, schema, parentSchema, it),
      c = en(gen, keyword, a);
    if (it.opts.validateSchema !== !1) it.self.validateSchema(a, !0);
    let u = gen.name("valid");
    (e.subschema(
      {
        schema: a,
        schemaPath: I.nil,
        errSchemaPath: `${it.errSchemaPath}/${keyword}`,
        topSchemaRef: c,
        compositeRule: !0,
      },
      u,
    ),
      e.pass(u, () => e.error(!0)));
  }
  tn.macroKeywordCode = ku;
  function qu(e, t) {
    var r;
    let { gen: gen, keyword: keyword, schema: schema, parentSchema: parentSchema, $data: $data, it: it } = e;
    ju(it, t);
    let u = !$data && t.compile ? t.compile.call(it.self, schema, parentSchema, it) : t.validate,
      l = en(gen, keyword, u),
      f = gen.let("valid");
    (e.block$data(f, b), e.ok((r = t.valid) !== null && r !== void 0 ? r : f));
    function b() {
      if (t.errors === !1) {
        if ((p(), t.modifying)) Xs(e);
        y(() => e.error());
      } else {
        let v = t.async ? _() : h();
        if (t.modifying) Xs(e);
        y(() => Ou(e, v));
      }
    }
    function _() {
      let v = gen.let("ruleErrs", null);
      return (
        gen.try(
          () => p(I._`await `),
          (O) =>
            gen.assign(f, !1).if(
              I._`${O} instanceof ${it.ValidationError}`,
              () => gen.assign(v, I._`${O}.errors`),
              () => gen.throw(O),
            ),
        ),
        v
      );
    }
    function h() {
      let v = I._`${l}.errors`;
      return (gen.assign(v, null), p(I.nil), v);
    }
    function p(v = t.async ? I._`await ` : I.nil) {
      let O = it.opts.passContext ? Ce.default.this : Ce.default.self,
        q = !(("compile" in t && !$data) || t.schema === !1);
      gen.assign(f, I._`${v}${Ys.callValidateCode(e, l, O, q)}`, t.modifying);
    }
    function y(v) {
      var O;
      gen.if(I.not((O = t.valid) !== null && O !== void 0 ? O : f), v);
    }
  }
  tn.funcKeywordCode = qu;
  function Xs(e) {
    let { gen: gen, data: r, it: it } = e;
    gen.if(it.parentData, () => gen.assign(r, I._`${it.parentData}[${it.parentDataProperty}]`));
  }
  function Ou(e, t) {
    let { gen: gen } = e;
    gen.if(
      I._`Array.isArray(${t})`,
      () => {
        (gen
          .assign(
            Ce.default.vErrors,
            I._`${Ce.default.vErrors} === null ? ${t} : ${Ce.default.vErrors}.concat(${t})`,
          )
          .assign(Ce.default.errors, I._`${Ce.default.vErrors}.length`),
          Zs.extendErrors(e));
      },
      () => e.error(),
    );
  }
  function ju({ schemaEnv: schemaEnv }, t) {
    if (t.async && !schemaEnv.$async) throw Error("async keyword in sync schema");
  }
  function en(e, t, r) {
    if (r === void 0) throw Error(`keyword "${t}" failed to compile`);
    return e.scopeValue("keyword", typeof r == "function" ? { ref: r } : { ref: r, code: I.stringify(r) });
  }
  function xu(e, t, r = !1) {
    return (
      !t.length ||
      t.some((s) =>
        s === "array"
          ? Array.isArray(e)
          : s === "object"
            ? e && typeof e == "object" && !Array.isArray(e)
            : typeof e == s || (r && typeof e > "u"),
      )
    );
  }
  tn.validSchemaType = xu;
  function Ru({ schema: schema, opts: opts, self: r, errSchemaPath: errSchemaPath }, n, o) {
    if (Array.isArray(n.keyword) ? !n.keyword.includes(o) : n.keyword !== o)
      throw Error("ajv implementation error");
    let dependencies = n.dependencies;
    if (
      dependencies === null || dependencies === void 0
        ? void 0
        : dependencies.some((a) => !Object.prototype.hasOwnProperty.call(schema, a))
    )
      throw Error(`parent schema must have dependencies of ${o}: ${dependencies.join(",")}`);
    if (n.validateSchema) {
      if (!n.validateSchema(schema[o])) {
        let c =
          `keyword "${o}" value is invalid at path "${errSchemaPath}": ` +
          r.errorsText(n.validateSchema.errors);
        if (opts.validateSchema === "log") r.logger.error(c);
        else throw Error(c);
      }
    }
  }
  tn.validateKeywordUsage = Ru;
});

export { sn };
