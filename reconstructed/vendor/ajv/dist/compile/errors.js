/**
 * ajv/dist/compile/errors.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { uh } from "./codegen/index.js";
import { ew } from "./util.js";
import { DPe } from "./names.js";

//@ chunk-s82q9s4x.js:21375-24395 cjs-fingerprint
var ct = x(function (vs) {
  Object.defineProperty(vs, "__esModule", { value: !0 });
  vs.extendErrors =
    vs.resetErrorsCount =
    vs.reportExtraError =
    vs.reportError =
    vs.keyword$DataError =
    vs.keywordError =
      void 0;
  var w = uh(),
    ge = ew(),
    L = DPe();
  vs.keywordError = { message: ({ keyword: keyword }) => w.str`must pass "${keyword}" keyword validation` };
  vs.keyword$DataError = {
    message: ({ keyword: keyword, schemaType: schemaType }) =>
      schemaType
        ? w.str`"${keyword}" keyword must be ${schemaType} ($data)`
        : w.str`"${keyword}" keyword is invalid ($data)`,
  };
  function vc(e, t = vs.keywordError, r, s) {
    let { it: it } = e,
      { gen: gen, compositeRule: compositeRule, allErrors: allErrors } = it,
      c = $s(e, t, r);
    if (s !== null && s !== void 0 ? s : compositeRule || allErrors) _s(gen, c);
    else gs(it, w._`[${c}]`);
  }
  vs.reportError = vc;
  function wc(e, t = vs.keywordError, r) {
    let { it: it } = e,
      { gen: gen, compositeRule: compositeRule, allErrors: allErrors } = it,
      a = $s(e, t, r);
    if ((_s(gen, a), !(compositeRule || allErrors))) gs(it, L.default.vErrors);
  }
  vs.reportExtraError = wc;
  function bc(e, t) {
    (e.assign(L.default.errors, t),
      e.if(w._`${L.default.vErrors} !== null`, () =>
        e.if(
          t,
          () => e.assign(w._`${L.default.vErrors}.length`, t),
          () => e.assign(L.default.vErrors, null),
        ),
      ));
  }
  vs.resetErrorsCount = bc;
  function Ec({
    gen: gen,
    keyword: keyword,
    schemaValue: schemaValue,
    data: s,
    errsCount: errsCount,
    it: it,
  }) {
    if (errsCount === void 0) throw Error("ajv implementation error");
    let i = gen.name("err");
    gen.forRange("i", errsCount, L.default.errors, (a) => {
      if (
        (gen.const(i, w._`${L.default.vErrors}[${a}]`),
        gen.if(w._`${i}.instancePath === undefined`, () =>
          gen.assign(w._`${i}.instancePath`, w.strConcat(L.default.instancePath, it.errorPath)),
        ),
        gen.assign(w._`${i}.schemaPath`, w.str`${it.errSchemaPath}/${keyword}`),
        it.opts.verbose)
      )
        (gen.assign(w._`${i}.schema`, schemaValue), gen.assign(w._`${i}.data`, s));
    });
  }
  vs.extendErrors = Ec;
  function _s(e, t) {
    let r = e.const("err", t);
    (e.if(
      w._`${L.default.vErrors} === null`,
      () => e.assign(L.default.vErrors, w._`[${r}]`),
      w._`${L.default.vErrors}.push(${r})`,
    ),
      e.code(w._`${L.default.errors}++`));
  }
  function gs(e, t) {
    let { gen: gen, validateName: validateName, schemaEnv: schemaEnv } = e;
    if (schemaEnv.$async) gen.throw(w._`new ${e.ValidationError}(${t})`);
    else (gen.assign(w._`${validateName}.errors`, t), gen.return(!1));
  }
  var Te = {
    keyword: new w.Name("keyword"),
    schemaPath: new w.Name("schemaPath"),
    params: new w.Name("params"),
    propertyName: new w.Name("propertyName"),
    message: new w.Name("message"),
    schema: new w.Name("schema"),
    parentSchema: new w.Name("parentSchema"),
  };
  function $s(e, t, r) {
    let { createErrors: createErrors } = e.it;
    if (createErrors === !1) return w._`{}`;
    return Sc(e, t, r);
  }
  function Sc(e, t, r = {}) {
    let { gen: gen, it: it } = e,
      o = [Pc(it, r), Nc(e, r)];
    return (kc(e, t, o), gen.object(...o));
  }
  function Pc({ errorPath: errorPath }, { instancePath: instancePath }) {
    let r = instancePath ? w.str`${errorPath}${ge.getErrorPath(instancePath, ge.Type.Str)}` : errorPath;
    return [L.default.instancePath, w.strConcat(L.default.instancePath, r)];
  }
  function Nc(
    { keyword: keyword, it: { errSchemaPath: t } },
    { schemaPath: schemaPath, parentSchema: parentSchema },
  ) {
    let n = parentSchema ? t : w.str`${t}/${keyword}`;
    if (schemaPath) n = w.str`${n}${ge.getErrorPath(schemaPath, ge.Type.Str)}`;
    return [Te.schemaPath, n];
  }
  function kc(e, { params: params, message: message }, s) {
    let { keyword: keyword, data: o, schemaValue: schemaValue, it: it } = e,
      { opts: opts, propertyName: propertyName, topSchemaRef: topSchemaRef, schemaPath: schemaPath } = it;
    if (
      (s.push(
        [Te.keyword, keyword],
        [Te.params, typeof params == "function" ? params(e) : params || w._`{}`],
      ),
      opts.messages)
    )
      s.push([Te.message, typeof message == "function" ? message(e) : message]);
    if (opts.verbose)
      s.push(
        [Te.schema, schemaValue],
        [Te.parentSchema, w._`${topSchemaRef}${schemaPath}`],
        [L.default.data, o],
      );
    if (propertyName) s.push([Te.propertyName, propertyName]);
  }
});

export { ct };
